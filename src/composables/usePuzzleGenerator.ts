/**
 * Composable que encapsula la lógica de generación procedural de puzzles Murdoku.
 * Diseña el mapa con zonas y objetos (ocupables y no ocupables),
 * calcula la solución oculta de personajes y redacta pistas deductivas.
 */
import { ref } from 'vue'
import type {
  GeneratedPuzzle, Zone, Character, Clue, PlacedObject,
  ThemeId, DifficultyId, ZoneType, MapObject, AccessoryId, GameMode
} from '@/types/puzzle'
import { getTheme, getDifficulty } from '@/data/themes'
import { ACCESSORY_META, ACCESSORY_LIST, getCharacterAccessories } from '@/types/puzzle'

// ============================================================
// UTILIDADES DE ALEATORIEDAD
// ============================================================

/** Número aleatorio entre min y max (inclusive) */
function rInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Elemento aleatorio de un array */
function rPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Mezcla un array (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Genera un ID único */
function genId(): string {
  return Math.random().toString(36).slice(2, 9)
}

// ============================================================
// COLORES PARA ZONAS
// ============================================================

const ZONE_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
  '#84CC16', '#EAB308', '#A855F7', '#0EA5E9', '#D946EF',
]

// ============================================================
// GENERACIÓN DE ZONAS
// ============================================================

/**
 * Genera zonas del mapa dividiendo el grid de forma regular y orgánica.
 */
function generateZones(
  gridSize: number,
  numZones: number,
  zoneNames: string[]
): Zone[] {
  const zones: Zone[] = []
  const colorShuffled = shuffle([...ZONE_COLORS])
  const namesSample = shuffle([...zoneNames]).slice(0, numZones)
  const zoneEmojis = ['🚢', '⛵', '🏴', '🏖️', '🌊', '⛰️', '🍺', '🪨', '🏰', '🌴']

  const usedCells = new Set<string>()
  const allCells: [number, number][] = []
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      allCells.push([r, c])
    }
  }

  const zonesPerRow = Math.ceil(Math.sqrt(numZones))
  const zoneWidth = Math.ceil(gridSize / zonesPerRow)
  const zoneHeight = Math.ceil(gridSize / Math.ceil(numZones / zonesPerRow))

  let zoneIdx = 0
  for (let br = 0; br < gridSize && zoneIdx < numZones; br += zoneHeight) {
    for (let bc = 0; bc < gridSize && zoneIdx < numZones; bc += zoneWidth) {
      const cells: [number, number][] = []
      const rEnd = Math.min(br + zoneHeight, gridSize)
      const cEnd = Math.min(bc + zoneWidth, gridSize)

      for (let r = br; r < rEnd; r++) {
        for (let c = bc; c < cEnd; c++) {
          const key = `${r},${c}`
          if (!usedCells.has(key)) {
            cells.push([r, c])
            usedCells.add(key)
          }
        }
      }

      if (cells.length > 0) {
        const zoneTypes: ZoneType[] = ['vehicle', 'room', 'outdoor', 'water', 'special']
        zones.push({
          id: `zone-${zoneIdx}`,
          name: namesSample[zoneIdx] ?? `Zona ${zoneIdx + 1}`,
          type: zoneTypes[zoneIdx % zoneTypes.length],
          emoji: zoneEmojis[zoneIdx % zoneEmojis.length],
          color: colorShuffled[zoneIdx % colorShuffled.length],
          cells,
          topRow: br,
        })
        zoneIdx++
      }
    }
  }

  // Celdas residuales asignadas a la última zona
  for (const [r, c] of allCells) {
    if (!usedCells.has(`${r},${c}`) && zones.length > 0) {
      zones[zones.length - 1].cells.push([r, c])
    }
  }

  return zones
}

// ============================================================
// GENERACIÓN DE OBJETOS (MAPA DEL ESCENARIO)
// ============================================================

/**
 * Coloca objetos ocupables (camas, sillas, hamacas) y no ocupables (fogatas, árboles, rocas...)
 * en el mapa antes de ubicar a los personajes.
 */
function generateObjects(
  gridSize: number,
  theme: ReturnType<typeof getTheme>
): PlacedObject[] {
  const placed: PlacedObject[] = []
  const usedCells = new Set<string>()

  const occupableObjects = theme.objects.filter((o: MapObject) => o.occupiable)
  const nonOccupableObjects = theme.objects.filter((o: MapObject) => !o.occupiable)

  // 1. Colocar algunos objetos ocupables (camas, hamacas, sillas)
  // Por ejemplo, 3 a 6 objetos ocupables según el tamaño del mapa
  const numOcc = Math.max(3, Math.floor(gridSize * 0.45))
  let attemptsOcc = 0
  while (placed.filter(p => occupableObjects.some(o => o.id === p.objectId)).length < numOcc && attemptsOcc < 500 && occupableObjects.length > 0) {
    attemptsOcc++
    const r = rInt(0, gridSize - 1)
    const c = rInt(0, gridSize - 1)
    const key = `${r},${c}`
    if (usedCells.has(key)) continue

    const obj = rPick(occupableObjects)
    placed.push({ objectId: obj.id, row: r, col: c })
    usedCells.add(key)
  }

  // 2. Colocar objetos no ocupables (fijos: árboles, fogatas, rocas, lápidas...)
  // Densidad: ~18% a 24% del mapa para que sirvan de referencias ricas
  const numNonOcc = Math.floor(gridSize * gridSize * 0.18)
  let attemptsNonOcc = 0
  while (placed.length < (numOcc + numNonOcc) && attemptsNonOcc < 2000 && nonOccupableObjects.length > 0) {
    attemptsNonOcc++
    const r = rInt(0, gridSize - 1)
    const c = rInt(0, gridSize - 1)
    const key = `${r},${c}`
    if (usedCells.has(key)) continue

    const obj = rPick(nonOccupableObjects)
    placed.push({ objectId: obj.id, row: r, col: c })
    usedCells.add(key)
  }

  return placed
}

// ============================================================
// GENERACIÓN DE SOLUCIÓN DE PERSONAJES
// ============================================================

/**
 * Calcula la solución oculta: ubica a los sospechosos de forma que:
 * 1. Cada personaje ocupa una celda única en su fila y en su columna (regla Murdoku).
 * 2. NO puede estar en una celda con objeto no ocupable (roca, fogata, árbol...).
 * 3. SÍ puede estar en una celda vacía o sobre un objeto ocupable (cama, silla, hamaca).
 */
function generateCharacters(
  gridSize: number,
  numChars: number,
  zones: Zone[],
  placedObjects: PlacedObject[],
  theme: ReturnType<typeof getTheme>
): Character[] {
  const characters: Character[] = []
  const blockedCells = new Set<string>()

  // Identificar qué objetos NO son ocupables
  const nonOccIds = new Set(theme.objects.filter((o: MapObject) => !o.occupiable).map(o => o.id))
  for (const p of placedObjects) {
    if (nonOccIds.has(p.objectId)) {
      blockedCells.add(`${p.row},${p.col}`)
    }
  }

  const usedRows = new Set<number>()
  const usedCols = new Set<number>()

  const maleNames = shuffle([...theme.maleNames])
  const femaleNames = shuffle([...theme.femaleNames])

  // Emojis específicos por género (1 sola posición) para que los personajes femeninos tengan avatares femeninos
  const maleEmojis = shuffle([...(theme.maleEmojis && theme.maleEmojis.length > 0
    ? theme.maleEmojis
    : ['🧔', '👨', '👦', '👴', '👱', '🤴', '🤠', '👮', '👷', '💂', '👲', '👳', '🎅', '🤵', '🥷', '🕺', '🏊', '🏇', '🤺'])])

  const femaleEmojis = shuffle([...(theme.femaleEmojis && theme.femaleEmojis.length > 0
    ? theme.femaleEmojis
    : ['👩', '👧', '👵', '👸', '🧕', '👰', '💃', '🧚', '🧜', '🧝', '🧙', '💁', '🙋', '🧗', '🏄', '🧖', '🧘', '🤸'])])

  const characterMeta: { name: string; emoji: string }[] = []
  let mCount = 0
  let fCount = 0
  for (let i = 0; i < numChars; i++) {
    if (i % 2 === 0) {
      const name = maleNames[mCount % maleNames.length] ?? `Sospechoso ${i}`
      const emoji = maleEmojis[mCount % maleEmojis.length]
      mCount++
      characterMeta.push({ name, emoji })
    } else {
      const name = femaleNames[fCount % femaleNames.length] ?? `Sospechosa ${i}`
      const emoji = femaleEmojis[fCount % femaleEmojis.length]
      fCount++
      characterMeta.push({ name, emoji })
    }
  }

  // Reparto de rasgos visuales (sombrero, gafas, parche, bufanda, bastón,
  // anillo, medalla): como máximo uno por personaje y solo en una parte
  // de ellos (~45%), para que los rasgos sirvan como seña de identidad
  // en las pistas sin saturar el tablero.
  // Se garantiza al menos un personaje con rasgo y al menos uno sin rasgo.
  const numWithAccessory = Math.max(1, Math.min(numChars - 1, Math.round(numChars * 0.45)))
  const shuffledPositions = shuffle([...Array(numChars).keys()])
  const accessoryCycle = shuffle(ACCESSORY_LIST.map((m) => m.id))
  const accessoryByIndex = new Map<number, AccessoryId>()
  shuffledPositions.slice(0, numWithAccessory).forEach((charPos, k) => {
    accessoryByIndex.set(charPos, accessoryCycle[k % accessoryCycle.length])
  })

  let attempts = 0
  let charIdx = 0

  while (charIdx < numChars && attempts < 4000) {
    attempts++
    const row = rInt(0, gridSize - 1)
    const col = rInt(0, gridSize - 1)
    const key = `${row},${col}`

    // Regla Murdoku: fila única, columna única, y celda no bloqueada
    if (usedRows.has(row) || usedCols.has(col) || blockedCells.has(key)) continue

    const zone = zones.find(z => z.cells.some(([r, c]: [number, number]) => r === row && c === col))
    if (!zone) continue

    usedRows.add(row)
    usedCols.add(col)

    // Rasgo asignado a este personaje (como máximo uno)
    const accessory = accessoryByIndex.get(charIdx)

    characters.push({
      id: `char-${charIdx}`,
      name: characterMeta[charIdx].name,
      emoji: characterMeta[charIdx].emoji,
      row,
      col,
      zoneId: zone.id,
      hat: accessory === 'hat',
      glasses: accessory === 'glasses',
      eyepatch: accessory === 'eyepatch',
      scarf: accessory === 'scarf',
      cane: accessory === 'cane',
      ring: accessory === 'ring',
      medal: accessory === 'medal',
    })
    charIdx++
  }

  return characters
}

// ============================================================
// GENERACIÓN DE PISTAS DEDUCTIVAS REALISTAS
// ============================================================

/**
 * Genera el conjunto de pistas para que el jugador pueda deducir
 * la posición de cada personaje a partir de los objetos del mapa.
 */
function generateClues(
  characters: Character[],
  zones: Zone[],
  placedObjects: PlacedObject[],
  theme: ReturnType<typeof getTheme>,
  complexity: 'simple' | 'moderate' | 'complex' | 'devious'
): Clue[] {
  const clues: Clue[] = []
  const zoneMap = new Map(zones.map(z => [z.id, z]))
  const objMap = new Map(theme.objects.map((o: MapObject) => [o.id, o]))

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i]
    const zone = zoneMap.get(char.zoneId)
    // Otros personajes que llevan algún rasgo (candidatos para referencias)
    const othersWithAccessory = characters.filter(
      c => c.id !== char.id && getCharacterAccessories(c).length > 0
    )

    // 1. ¿Está el personaje sobre un objeto ocupable (cama, silla, hamaca)?
    const objOnCell = placedObjects.find(p => p.row === char.row && p.col === char.col)
    const occInfo = objOnCell ? objMap.get(objOnCell.objectId) : undefined

    let clueText = ''
    let clueType: Clue['type'] = 'zone'

    if (occInfo && occInfo.occupiable && Math.random() < 0.7) {
      // Pista directa de objeto ocupable: "Bart estaba en una hamaca"
      const prep = occInfo.id === 'bed' ? 'en una cama' : occInfo.id === 'hammock' ? 'en una hamaca' : `en un ${occInfo.name.toLowerCase()}`
      clueText = `Estaba ${prep}.`
      clueType = 'adjacency'
    } else {
      // 2. ¿Tiene objetos no ocupables adyacentes (distancia Manhattan = 1)?
      const adjObjects = placedObjects.filter(p =>
        (Math.abs(p.row - char.row) + Math.abs(p.col - char.col)) === 1
      )

      if (adjObjects.length > 0 && Math.random() < 0.6) {
        const targetObj = rPick(adjObjects)
        const targetInfo = objMap.get(targetObj.objectId)
        if (targetInfo) {
          const art = /^[aeiou]/i.test(targetInfo.name) ? 'una' : 'un'
          clueText = `Estaba junto a ${targetInfo.id === 'flowers' ? 'unas flores' : `${art} ${targetInfo.name.toLowerCase()}`}.`
          clueType = 'adjacency'
        }
      }
    }

    // Si aún no hay pista o queremos variar con pistas de zona/relativas:
    if (!clueText) {
      const mode = rPick(['zone_top', 'cardinal', 'relative', 'accessory_zone', 'accessory_relative', 'zone'] as const)

      if (mode === 'zone_top' && zone && zone.topRow !== undefined && char.row === zone.topRow) {
        clueText = `Estaba en la fila superior de su zona (${zone.name}).`
        clueType = 'row'
      } else if (mode === 'accessory_zone' && othersWithAccessory.length > 0) {
        // Referencia por rasgo en la misma zona: "Estaba en la misma zona
        // que Marta, que llevaba sombrero." (verificado: misma zoneId)
        const sameZone = othersWithAccessory.filter(o => o.zoneId === char.zoneId)
        if (sameZone.length > 0) {
          const other = rPick(sameZone)
          const otherAcc = getCharacterAccessories(other)[0]
          clueText = `Estaba en la misma zona que ${other.name}, que llevaba ${ACCESSORY_META[otherAcc].wornPhrase}.`
          clueType = 'relative'
        } else {
          clueText = `Se encontraba en ${zone?.name ?? 'un barco'}.`
          clueType = 'zone'
        }
      } else if (mode === 'accessory_relative' && othersWithAccessory.length > 0) {
        // Referencia por rasgo este/oeste: "Estaba al este de Pedro, que
        // llevaba un parche en el ojo." (verificado: columna menor)
        const eastOf = othersWithAccessory.filter(o => o.col < char.col)
        const westOf = othersWithAccessory.filter(o => o.col > char.col)
        const describe = (other: Character) => {
          const otherAcc = getCharacterAccessories(other)[0]
          return `que llevaba ${ACCESSORY_META[otherAcc].wornPhrase}`
        }
        if (eastOf.length > 0 && westOf.length > 0 && Math.random() < 0.5) {
          const e = rPick(eastOf)
          const w = rPick(westOf)
          clueText = `Estaba al este de ${e.name}, ${describe(e)} y al oeste de ${w.name}, ${describe(w)}.`
          clueType = 'relative'
        } else if (eastOf.length > 0) {
          const e = rPick(eastOf)
          clueText = `Estaba al este de ${e.name}, ${describe(e)}.`
          clueType = 'relative'
        } else if (westOf.length > 0) {
          const w = rPick(westOf)
          clueText = `Estaba al oeste de ${w.name}, ${describe(w)}.`
          clueType = 'relative'
        } else {
          clueText = `Se encontraba en ${zone?.name ?? 'un barco'}.`
          clueType = 'zone'
        }
      } else if (mode === 'relative' && characters.length > 2) {
        const others = characters.filter(c => c.id !== char.id)
        const westOf = others.find(o => o.col > char.col)
        const eastOf = others.find(o => o.col < char.col)

        if (westOf && eastOf && Math.random() < 0.5) {
          clueText = `Estaba al este de ${eastOf.name} y al oeste de ${westOf.name}.`
          clueType = 'relative'
        } else if (eastOf) {
          clueText = `Estaba al este de ${eastOf.name}.`
          clueType = 'relative'
        } else {
          clueText = `Se encontraba en ${zone?.name ?? 'un barco'}.`
          clueType = 'zone'
        }
      } else if (mode === 'cardinal') {
        clueText = `Estaba en la zona ${zone?.name ?? 'principal'}.`
        clueType = 'zone'
      } else {
        clueText = `Se encontraba explorando ${zone?.name ?? 'la isla'}.`
        clueType = 'zone'
      }
    }

    // Seña de identidad: si el personaje lleva un rasgo, mencionarlo junto
    // a la pista de localización ("... Llevaba bufanda.")
    const ownAccessory = getCharacterAccessories(char)[0]
    if (ownAccessory && Math.random() < 0.7) {
      clueText += ` ${ACCESSORY_META[ownAccessory].selfSentence}`
    }

    // Frases secundarias verificadas: cada pista combina la localización
    // principal con datos adicionales ciertos (zona, distancia norte/sur,
    // este/oeste, ausencia de objetos o de rasgos). Todas se comprueban
    // contra la solución y son coherentes con la regla de 1 persona por
    // fila y por columna. Se agrupan por categoría para mantener variedad
    // y se añaden 1 siempre + 1 extra según la complejidad.
    const mainMentionsZone = clueType === 'zone' || clueType === 'row'
    const mainIsRelative = clueType === 'relative'
    const others = characters.filter(c => c.id !== char.id)
    const buckets: Array<{ kind: string; texts: string[] }> = []

    // — Nombre de la zona (si la pista principal no la menciona) —
    if (!mainMentionsZone && zone) {
      buckets.push({ kind: 'zone', texts: [`Su zona era ${zone.name}.`] })
    }

    // — Distancia norte/sur respecto a otro personaje (las filas son
    // siempre distintas por la regla de unicidad, así que diff >= 1) —
    if (others.length > 0) {
      const ref = rPick(others)
      const diff = Math.abs(ref.row - char.row)
      if (diff >= 1) {
        const qty = diff === 1 ? 'una fila' : `${diff} filas`
        const dir = ref.row > char.row ? 'al norte' : 'al sur'
        buckets.push({
          kind: 'northsouth',
          texts: [
            `Estaba exactamente ${qty} ${dir} de ${ref.name}.`,
            `Estaba al menos ${qty} ${dir} de ${ref.name}.`,
          ],
        })
      }
    }

    // — Este/oeste respecto a otro personaje (si la principal no lo dice) —
    if (!mainIsRelative && others.length > 0) {
      const eastOf = others.filter(o => o.col < char.col)
      const westOf = others.filter(o => o.col > char.col)
      const ew: string[] = []
      if (eastOf.length > 0) ew.push(`Estaba al este de ${rPick(eastOf).name}.`)
      if (westOf.length > 0) ew.push(`Estaba al oeste de ${rPick(westOf).name}.`)
      if (ew.length > 0) buckets.push({ kind: 'eastwest', texts: ew })
    }

    // — Ausencia de un objeto en toda su columna (verificado) —
    {
      const nonOccThemeObjs = theme.objects.filter((o: MapObject) => !o.occupiable)
      const objectsInCol = placedObjects.filter(p => p.col === char.col)
      const sampleObj = nonOccThemeObjs.length > 0 ? rPick(nonOccThemeObjs) : null
      const hasSampleObj = sampleObj ? objectsInCol.some(p => p.objectId === sampleObj.id) : false
      if (sampleObj && !hasSampleObj) {
        const art = /^[aeiou]/i.test(sampleObj.name) ? 'ninguna' : 'ningún'
        buckets.push({ kind: 'object', texts: [`No había ${art} ${sampleObj.name.toLowerCase()} en toda su columna.`] })
      }
    }

    // — Columna exacta (verificada; complementa sobre todo a las pistas de zona) —
    if (clueType === 'zone') {
      buckets.push({ kind: 'column', texts: [`Estaba en la columna ${char.col + 1}.`] })
    }

    // — Negaciones de rasgos verificadas contra la solución y coherentes
    // con la regla de 1 por fila/columna: solo la zona compartida y las
    // columnas adyacentes (nunca la propia fila o columna).
    {
      const ownAcc = new Set(getCharacterAccessories(char))
      const negatives: string[] = []
      for (const meta of ACCESSORY_LIST) {
        if (ownAcc.has(meta.id)) continue
        const inZone = characters.some(
          o => o.id !== char.id && getCharacterAccessories(o).includes(meta.id) && o.zoneId === char.zoneId
        )
        if (!inZone) negatives.push(`Nadie más en su zona llevaba ${meta.negativePhrase}.`)
        const inAdjCol = characters.some(
          o => getCharacterAccessories(o).includes(meta.id) && Math.abs(o.col - char.col) === 1
        )
        if (!inAdjCol) negatives.push(`Nadie en una columna adyacente llevaba ${meta.negativePhrase}.`)
      }
      if (negatives.length > 0) buckets.push({ kind: 'trait', texts: negatives })
    }

    // Añadir una secundaria de una categoría al azar y, según la
    // complejidad, una segunda de otra categoría distinta.
    const extraProb = complexity === 'simple' ? 0.2 : complexity === 'moderate' ? 0.3 : 0.45
    const order = shuffle(buckets)
    if (order.length > 0) {
      clueText += ` ${rPick(order[0].texts)}`
      if (order[0].kind === 'column') clueType = 'column'
    }
    if (order.length > 1 && Math.random() < extraProb) {
      clueText += ` ${rPick(order[1].texts)}`
      if (order[1].kind === 'column') clueType = 'column'
    }

    clues.push({
      characterId: char.id,
      characterName: char.name,
      text: clueText,
      type: clueType,
    })
  }

  return clues
}

/**
 * Sanea el texto de una pista eliminando frases incoherentes con la regla
 * de 1 persona por fila y por columna (p. ej. "Nadie en su fila/columna
 * llevaba ..." o "en la misma fila/columna que ..."). Esas frases son
 * trivialmente ciertas o implican compartir fila/columna, lo cual es
 * imposible y despista al jugador. Se conservan la zona y las columnas
 * adyacentes, que sí son coherentes.
 */
function sanitizeClueText(text: string): string {
  return text
    .replace(/Nadie en su fila llevaba [^.]+\.\s*/gi, '')
    .replace(/Nadie en su columna llevaba [^.]+\.\s*/gi, '')
    .replace(/en la misma fila que [^.]+\.\s*/gi, '')
    .replace(/en la misma columna que [^.]+\.\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Aplica el saneado a una lista de pistas sin alterar las que ya son coherentes */
function sanitizeClues(clues: Clue[]): Clue[] {
  return clues.map((clue) => ({ ...clue, text: sanitizeClueText(clue.text) }))
}

// ============================================================
// TÍTULO Y DESCRIPCIÓN
// ============================================================

function generateTitle(
  theme: ReturnType<typeof getTheme>,
  difficulty: ReturnType<typeof getDifficulty>,
  mode: GameMode = 'treasure',
): string {
  const titles: Record<string, string[]> = {
    pirates: ['El Tesoro Perdido', 'La Isla de la Muerte', 'Misterio en el Galeón', 'El Mapa Secreto', 'Traición en la Balandra'],
    medieval: ['El Traidor del Castillo', 'La Conspiración de Valdorn', 'El Veneno de la Corona', 'La Espada Robada'],
    scifi: ['Señal en el Hiperespacio', 'La IA Rebelde', 'El Reactor Desactivado', 'Misterio en el Hangar'],
    western: ['El Asalto al Banco', 'El Forajido Oculto', 'Duelo en el Saloon', 'La Mina Abandonada'],
    jungle: ['El Ídolo de Oro', 'La Maldición del Templo', 'Perdidos en el Manglar', 'El Secreto de la Selva'],
    spooky: ['La Cripta Sellada', 'El Fantasma del Torreón', 'La Noche del Ritual', 'El Libro Prohibido'],
    detective: ['El Caso de Baker Street', 'El Veneno del Orient Express', 'El Secreto de la Mansión', 'La Coartada Rota'],
    egypt: ['La Maldición del Faraón', 'El Secreto de la Pirámide', 'El Tesoro del Nilo', 'La Tumba Sellada'],
    cyberpunk: ['El Hackeo Fantasma', 'Sabotaje en Neo-Tokyo', 'El Androide Desaparecido', 'Apagón en el Nivel Bajo'],
    feudal: ['El Traidor del Shogun', 'La Katana Robada', 'Sombras en la Pagoda', 'El Veneno del Té'],
    zombie: ['El Último Refugio', 'Brote en el Hospital', 'La Radio Silenciada', 'Noche en el Supermercado'],
    olympics: ['Sabotaje en la Final', 'El Récord Robado', 'Veneno en la Villa Olímpica', 'El Cronómetro Trucado'],
    kitchen: ['Veneno en el Servicio', 'El Secreto del Chef', 'Sabotaje en los Fogones', 'La Receta Robada'],
  }
  const murderTitles: Record<string, string[]> = {
    pirates: ['Asesinato en el Galeón', 'Muerte en la Balandra', 'El Crimen de la Isla Calavera'],
    medieval: ['Asesinato en el Castillo', 'Crimen en la Torre', 'Muerte en Valdorn'],
    scifi: ['Asesinato en el Hangar', 'Crimen en la Estación Orbital', 'Muerte en Criogenia'],
    western: ['Asesinato en el Saloon', 'Crimen en el Rancho', 'Muerte al Amanecer'],
    jungle: ['Asesinato en el Templo', 'Crimen en la Aldea', 'Muerte en el Manglar'],
    spooky: ['Asesinato en la Mansión', 'Crimen en la Cripta', 'Muerte en el Torreón'],
    detective: ['Asesinato en Baker Street', 'Crimen en la Mansión', 'Muerte en el Orient Express'],
    egypt: ['Asesinato en la Pirámide', 'Crimen a Orillas del Nilo', 'Muerte del Faraón'],
    cyberpunk: ['Asesinato en Neo-Tokyo', 'Crimen en el Nivel Bajo', 'Muerte en el Arcade'],
    feudal: ['Asesinato en el Dojo', 'Crimen en la Pagoda', 'Muerte del Shogun'],
    zombie: ['Asesinato en el Refugio', 'Crimen en el Hospital', 'Muerte en el Supermercado'],
    olympics: ['Asesinato en la Final', 'Crimen en la Villa Olímpica', 'Muerte en el Podio'],
    kitchen: ['Asesinato en los Fogones', 'Crimen en el Servicio', 'Muerte del Chef'],
  }
  const pool = mode === 'murder'
    ? (murderTitles[theme.id] ?? titles[theme.id] ?? titles.pirates)
    : (titles[theme.id] ?? titles.pirates)
  return `${rPick(pool)} · ${difficulty.name}`
}

function generateDescription(
  theme: ReturnType<typeof getTheme>,
  numChars: number,
  gridSize: number,
  mode: GameMode = 'treasure',
): string {
  if (mode === 'murder') {
    return `Caso clásico en ${theme.name.toLowerCase()} con ${numChars - 1} sospechosos y 1 víctima en un mapa de ${gridSize}×${gridSize}. El asesino es quien se quedó a solas con la víctima en su zona.`
  }
  return `Caso de deducción en ${theme.name.toLowerCase()} con ${numChars} sospechosos en un mapa de ${gridSize}×${gridSize}. El tesoro está enterrado en el cruce de la última fila y la última columna libres.`
}

/**
 * Elige víctima y asesino con la regla clásica: la zona de la víctima
 * contiene exactamente 2 personas (víctima + asesino).
 * @returns par víctima/asesino o null si ninguna zona cumple la regla
 */
function pickVictimAndMurderer(characters: Character[]): { victimId: string; murdererId: string } | null {
  const byZone = new Map<string, Character[]>()
  for (const c of characters) {
    const list = byZone.get(c.zoneId) ?? []
    list.push(c)
    byZone.set(c.zoneId, list)
  }
  const candidates = [...byZone.values()].filter((list) => list.length === 2)
  if (candidates.length === 0) return null
  const pair = rPick(candidates)
  const shuffled = shuffle(pair)
  return { victimId: shuffled[0].id, murdererId: shuffled[1].id }
}

/**
 * Genera el reparto del modo asesino: tantas personas como tamaño del grid
 * (tablero lleno, víctima incluida) y una zona con exactamente 2 ocupantes.
 * Reintenta la colocación hasta cumplir la regla del "a solas".
 */
function generateMurderCast(
  gridSize: number,
  zones: Zone[],
  placedObjects: PlacedObject[],
  theme: ReturnType<typeof getTheme>,
): { characters: Character[]; victimId: string; murdererId: string } | null {
  let lastChars: Character[] = []
  for (let attempt = 0; attempt < 120; attempt++) {
    const chars = generateCharacters(gridSize, gridSize, zones, placedObjects, theme)
    if (chars.length < gridSize) continue
    lastChars = chars
    const pair = pickVictimAndMurderer(chars)
    if (pair) {
      const characters = chars.map((c) => ({
        ...c,
        isVictim: c.id === pair.victimId,
      }))
      return { characters, ...pair }
    }
  }
  // Alternativa degradada: usar la zona menos ocupada aunque tenga más de 2,
  // para no bloquear la generación en mapas muy densos.
  if (lastChars.length >= gridSize) {
    const byZone = new Map<string, Character[]>()
    for (const c of lastChars) {
      const list = byZone.get(c.zoneId) ?? []
      list.push(c)
      byZone.set(c.zoneId, list)
    }
    const sorted = [...byZone.values()]
      .filter((l) => l.length >= 2)
      .sort((a, b) => a.length - b.length)
    if (sorted.length > 0) {
      const pair = shuffle(sorted[0]).slice(0, 2)
      const characters = lastChars.map((c) => ({ ...c, isVictim: c.id === pair[0].id }))
      return { characters, victimId: pair[0].id, murdererId: pair[1].id }
    }
  }
  return null
}

// ============================================================
// COMPOSABLE usePuzzleGenerator
// ============================================================

export function usePuzzleGenerator() {
  const isGenerating = ref(false)
  const progress = ref(0)
  const statusMessage = ref('Listo')

  async function progressStep(msg: string, targetProgress: number, delayMs: number) {
    statusMessage.value = msg
    const step = (targetProgress - progress.value) / 10
    for (let i = 0; i < 10; i++) {
      progress.value = Math.min(progress.value + step, targetProgress)
      await new Promise(r => setTimeout(r, delayMs / 10))
    }
  }

  /**
   * Genera un puzzle proceduralmente:
   * 1. Zonas del escenario
   * 2. Objetos del mapa (ocupables y no ocupables)
   * 3. Solución de personajes (1 por fila/columna)
   * 4. Pistas deductivas
   * 5a. Modo tesoro: coordenadas del Tesoro en la última casilla desocupada
   * 5b. Modo asesino: tablero lleno con víctima y asesino a solas en su zona
   */
  async function generatePuzzle(
    themeId: ThemeId,
    difficultyId: DifficultyId,
    mode: GameMode = 'treasure',
  ): Promise<GeneratedPuzzle | null> {
    isGenerating.value = true
    progress.value = 0

    try {
      const theme = getTheme(themeId)
      const difficulty = getDifficulty(difficultyId)
      const { gridSize, numCharacters, numZones, clueComplexity } = difficulty

      await progressStep('Diseñando la geografía y zonas del mapa...', 25, 500)
      const zones = generateZones(gridSize, numZones, theme.zones)

      await progressStep('Distribuyendo objetos ocupables y no ocupables...', 50, 500)
      const placedObjects = generateObjects(gridSize, theme)

      await progressStep('Calculando posiciones válidas de los personajes...', 75, 500)

      if (mode === 'murder') {
        const cast = generateMurderCast(gridSize, zones, placedObjects, theme)
        if (!cast) return null

        await progressStep('Redactando pistas y testimonios deductivos...', 90, 500)
        const rawClues = generateClues(cast.characters, zones, placedObjects, theme, clueComplexity)
        // La pista de la víctima es siempre la regla clásica del "a solas"
        const clues = sanitizeClues(
          rawClues.map((clue) =>
            clue.characterId === cast.victimId
              ? { ...clue, text: 'La víctima. Estaba a solas con el asesino.', type: 'special' as const }
              : clue,
          ),
        )

        await progressStep('Eligiendo a la víctima y al asesino...', 98, 300)

        const puzzle: GeneratedPuzzle = {
          id: genId(),
          theme: themeId,
          difficulty: difficultyId,
          mode: 'murder',
          title: generateTitle(theme, difficulty, 'murder'),
          description: generateDescription(theme, cast.characters.length, gridSize, 'murder'),
          gridSize,
          zones,
          characters: cast.characters,
          placedObjects,
          clues,
          treasureRow: -1,
          treasureCol: -1,
          victimId: cast.victimId,
          murdererId: cast.murdererId,
          generatedAt: new Date().toISOString(),
        }

        progress.value = 100
        statusMessage.value = '¡Puzzle generado con éxito!'
        return puzzle
      }

      const characters = generateCharacters(gridSize, numCharacters, zones, placedObjects, theme)

      await progressStep('Redactando pistas y testimonios deductivos...', 90, 500)
      const clues = sanitizeClues(generateClues(characters, zones, placedObjects, theme, clueComplexity))

      await progressStep('Ocultando el tesoro en la última casilla...', 98, 300)

      // REGLA Murdoku: el Tesoro esta en la ultima casilla, es decir, en el
      // cruce de la ultima fila y la ultima columna sin sospechosos.
      // Puede quedar enterrado bajo un objeto normalmente no ocupable.
      const rowsWithChar = new Set(characters.map(c => c.row))
      const colsWithChar = new Set(characters.map(c => c.col))
      const freeRows = Array.from({ length: gridSize }, (_, r) => r).filter(r => !rowsWithChar.has(r))
      const freeCols = Array.from({ length: gridSize }, (_, c) => c).filter(c => !colsWithChar.has(c))

      let treasureRow = gridSize
      let treasureCol = gridSize
      if (freeRows.length > 0 && freeCols.length > 0) {
        treasureRow = freeRows[freeRows.length - 1] + 1 // 1-indexed
        treasureCol = freeCols[freeCols.length - 1] + 1 // 1-indexed
      }

      const puzzle: GeneratedPuzzle = {
        id: genId(),
        theme: themeId,
        difficulty: difficultyId,
        mode: 'treasure',
        title: generateTitle(theme, difficulty, 'treasure'),
        description: generateDescription(theme, numCharacters, gridSize, 'treasure'),
        gridSize,
        zones,
        characters,
        placedObjects,
        clues,
        treasureRow,
        treasureCol,
        victimId: null,
        murdererId: null,
        generatedAt: new Date().toISOString(),
      }

      progress.value = 100
      statusMessage.value = '¡Puzzle generado con éxito!'
      return puzzle
    } catch (err) {
      console.error('Error generando puzzle:', err)
      return null
    } finally {
      isGenerating.value = false
    }
  }

  return {
    isGenerating,
    progress,
    statusMessage,
    generatePuzzle,
  }
}
