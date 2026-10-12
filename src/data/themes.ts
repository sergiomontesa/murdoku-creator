/**
 * Datos de todas las temáticas disponibles para Murdoku Creator.
 * Cada temática define zonas, objetos, personajes y estética propios.
 * REGLA: Cada objeto dentro de una misma temática tiene un icono/emoji ÚNICO.
 * Se pueden compartir los mismos iconos para el mismo tipo de objeto entre temáticas distintas.
 */
import type { ThemeInfo, DifficultyInfo, MapObject } from '@/types/puzzle'

// ============================================================
// CREADOR DE OBJETOS
// ============================================================

const createObj = (id: string, name: string, emoji: string, occupiable: boolean): MapObject => ({
  id, name, emoji, occupiable
})

// ============================================================
// TEMÁTICAS
// ============================================================

export const THEMES: Record<string, ThemeInfo> = {
  pirates: {
    id: 'pirates',
    name: 'Piratas',
    emoji: '🏴‍☠️',
    description: 'Alta mar, tesoros ocultos y misterios en las Indias Occidentales',
    gradient: 'from-amber-600 via-orange-700 to-red-900',
    accentColor: '#F5A623',
    zones: ['Balandras', 'Fragatas', 'Galeón', 'Acantilado', 'Playa de la Calavera', 'Cueva del Contrabandista', 'Taberna del Ancla', 'Agua / Arrecife', 'Faro'],
    objects: [
      // Objetos OCUPABLES (se pueden ocupar)
      createObj('bed', 'Cama', '🛏️', true),
      createObj('chair', 'Silla', '🪑', true),
      createObj('hammock', 'Hamaca', '🪁', true),

      // Objetos FIJOS / NO OCUPABLES (para pistas espaciales)
      createObj('campfire', 'Fogata', '🔥', false),
      createObj('tree', 'Árbol / Palmera', '🌴', false),
      createObj('flowers', 'Flores', '🌸', false),
      createObj('shark', 'Tiburón', '🦈', false),
      createObj('sack', 'Saco', '🎒', false),
      createObj('pig', 'Cerdo', '🐖', false),
      createObj('gravestone', 'Lápida', '🪦', false),
      createObj('crate', 'Caja', '📦', false),
      createObj('rope', 'Cuerda', '🪢', false),
      createObj('barrel', 'Barril', '🛢️', false),
      createObj('bookshelf', 'Estantería', '📚', false),
      createObj('bush', 'Arbusto', '🌿', false),
      createObj('table', 'Mesa', '🪵', false),
      createObj('rock', 'Roca', '🪨', false),
      createObj('cannon', 'Cañón', '💣', false),
    ],
    maleNames: ['Augustus', 'Bartholomew', 'Cedric', 'Dudley', 'Edgar', 'Flint', 'Gideon', 'Henry', 'Ignatius', 'Jasper', 'Kieran', 'Linus', 'Mortimer', 'Nathaniel', 'Orville', 'Pedro', 'Quentin', 'Roland', 'Sebastian', 'Tobias', 'Ulrich', 'Victor', 'Wilfred', 'Xavier', 'Yannis', 'Zephyr'],
    femaleNames: ['Abigail', 'Beatrice', 'Cordelia', 'Diana', 'Eiko', 'Fleur', 'Griselda', 'Hyacinth', 'Isolde', 'Josephine', 'Kathleen', 'Luna', 'Miriam', 'Norah', 'Ophelia', 'Penelope', 'Quinn', 'Rosalind', 'Seraphina', 'Temperance', 'Ursula', 'Vivienne', 'Wilhelmina', 'Xanthe', 'Yolanda', 'Zoe'],
  },

  medieval: {
    id: 'medieval',
    name: 'Medieval',
    emoji: '⚔️',
    description: 'Castillos, dragones y conspiraciones en el reino de Valdorn',
    gradient: 'from-stone-600 via-slate-700 to-gray-900',
    accentColor: '#8B7355',
    zones: ['Sala del Trono', 'Mazmorra', 'Torre', 'Capilla', 'Establo', 'Mercado', 'Bosque', 'Molino', 'Pozo'],
    objects: [
      // Objetos OCUPABLES
      createObj('throne', 'Trono Real', '👑', true),
      createObj('bed', 'Cama con Dosel', '🛏️', true),
      createObj('chair', 'Banco de Roble', '🪑', true),

      // Objetos FIJOS
      createObj('sword', 'Espada de Acero', '⚔️', false),
      createObj('shield', 'Escudo de Armas', '🛡️', false),
      createObj('torch', 'Antorcha', '🕯️', false),
      createObj('barrel', 'Barril de Cerveza', '🛢️', false),
      createObj('chalice', 'Cáliz Sagrado', '🏆', false),
      createObj('scroll', 'Pergamino Real', '📜', false),
      createObj('chains', 'Cadenas de Hierro', '⛓️', false),
      createObj('cauldron', 'Caldero Hirviente', '🍲', false),
      createObj('hay', 'Fardo de Paja', '🌾', false),
      createObj('tree', 'Roble Centenario', '🌲', false),
      createObj('well', 'Pozo de Piedra', '⛲', false),
    ],
    maleNames: ['Aldric', 'Bertrand', 'Conrad', 'Darian', 'Edmund', 'Florian', 'Gauthier', 'Heinrich', 'Ingram', 'Jourdain', 'Konrad', 'Leopold', 'Magnus', 'Nicolas', 'Oswald', 'Pascal', 'Quentin', 'Raynald', 'Sigfried', 'Thibault', 'Ulric', 'Valentin', 'Wilhelm', 'Xander'],
    femaleNames: ['Adelheid', 'Blanche', 'Cecily', 'Dagmar', 'Eleanor', 'Frieda', 'Gertrude', 'Hildegard', 'Ingrid', 'Johanna', 'Katarina', 'Lieselotte', 'Mathilde', 'Nathalie', 'Ottilie', 'Petra', 'Rosalind', 'Sigrid', 'Theodora', 'Ursula', 'Veronika', 'Wilhelmine'],
  },

  scifi: {
    id: 'scifi',
    name: 'Ciencia Ficción',
    emoji: '🚀',
    description: 'Naves espaciales, galaxias lejanas y misterios entre las estrellas',
    gradient: 'from-cyan-700 via-blue-800 to-indigo-900',
    accentColor: '#00D4FF',
    zones: ['Puente de Mando', 'Cuarto de Máquinas', 'Bahía de Carga', 'Laboratorio', 'Cámara de Criogenia', 'Hangar', 'Meseta de Datos', 'Módulo Médico'],
    objects: [
      // Objetos OCUPABLES
      createObj('cryo_pod', 'Cápsula de Criosueño', '❄️', true),
      createObj('seat', 'Asiento de Piloto', '💺', true),
      createObj('bunk', 'Litera Magnética', '🛏️', true),

      // Objetos FIJOS
      createObj('laser', 'Rifle Láser', '🔫', false),
      createObj('robot', 'Droide de Servicio', '🤖', false),
      createObj('computer', 'Terminal Cuántica', '💻', false),
      createObj('pod', 'Nave de Escape', '🛸', false),
      createObj('chemical', 'Reactor Químico', '⚗️', false),
      createObj('reactor', 'Núcleo de Fusión', '☢️', false),
      createObj('cable', 'Conducto Eléctrico', '🔌', false),
      createObj('helmet', 'Casco Espacial', '🪖', false),
      createObj('vent', 'Conducto de Ventilación', '🌀', false),
      createObj('alien', 'Espécimen Alienígena', '👾', false),
    ],
    maleNames: ['Axon', 'Brix', 'Corin', 'Daxon', 'Erix', 'Flux', 'Gravix', 'Helix', 'Ion', 'Juno', 'Kronos', 'Lux', 'Maxar', 'Neutron', 'Orion', 'Proxis', 'Quasar', 'Ryken', 'Sigma', 'Taurus', 'Ultrax', 'Vega', 'Warp'],
    femaleNames: ['Astra', 'Bora', 'Celeste', 'Deva', 'Eclipse', 'Fiona', 'Gamma', 'Halo', 'Iris', 'Juno', 'Kira', 'Luna', 'Maya', 'Nova', 'Orla', 'Prism', 'Quanta', 'Raya', 'Stella', 'Terra', 'Ula', 'Vega', 'Wren', 'Xara', 'Yara', 'Zara'],
  },

  western: {
    id: 'western',
    name: 'Western',
    emoji: '🤠',
    description: 'El lejano oeste, duelos al sol y secretos entre el polvo',
    gradient: 'from-yellow-700 via-amber-800 to-orange-900',
    accentColor: '#D4A017',
    zones: ['Saloon', 'Banco', 'Cárcel', 'Rancho', 'Mina', 'Herrería', 'Establos', 'Oficina del Sheriff', 'Desierto'],
    objects: [
      // Objetos OCUPABLES
      createObj('barstool', 'Taburete de Saloon', '🪑', true),
      createObj('bed', 'Cama de Rancho', '🛏️', true),

      // Objetos FIJOS
      createObj('revolver', 'Revólver Colt', '🔫', false),
      createObj('bottle', 'Botella de Licor', '🍾', false),
      createObj('horseshoe', 'Herradura', '🧲', false),
      createObj('barrel', 'Barril de Pólvora', '🛢️', false),
      createObj('rope', 'Lazo de Vaquero', '🪢', false),
      createObj('cactus', 'Cactus del Desierto', '🌵', false),
      createObj('gold', 'Bolsa de Pepitas de Oro', '🪙', false),
      createObj('dynamite', 'Dinamita', '🧨', false),
      createObj('hay', 'Fardo de Heno', '🌾', false),
      createObj('skull', 'Cráneo en la Arena', '💀', false),
      createObj('wanted', 'Cartel de Se Busca', '📜', false),
    ],
    maleNames: ['Buck', 'Cal', 'Dallas', 'Elias', 'Frank', 'Garrett', 'Hank', 'Ike', 'Jake', 'Kit', 'Levi', 'Mack', 'Ned', 'Otis', 'Pete', 'Quinn', 'Reno', 'Sam', 'Tex', 'Ulysses', 'Vince', 'Wade', 'Wyatt', 'Zeke'],
    femaleNames: ['Annie', 'Belle', 'Callie', 'Daisy', 'Emma', 'Faith', 'Grace', 'Hattie', 'Ida', 'Jessie', 'Kate', 'Lila', 'Mae', 'Nora', 'Opal', 'Pearl', 'Rose', 'Sadie', 'Tess', 'Una', 'Vera', 'Winnie'],
  },

  jungle: {
    id: 'jungle',
    name: 'Selva',
    emoji: '🌿',
    description: 'Ruinas antiguas, tribus ocultas y secretos entre la espesura',
    gradient: 'from-green-700 via-emerald-800 to-teal-900',
    accentColor: '#22C55E',
    zones: ['Templo', 'Aldea', 'Río', 'Cascada', 'Cueva', 'Claro', 'Copa de Árboles', 'Ruinas', 'Pantano'],
    objects: [
      // Objetos OCUPABLES
      createObj('hammock', 'Hamaca de Lianas', '🪁', true),
      createObj('mat', 'Esterilla de Chozón', '🛖', true),

      // Objetos FIJOS
      createObj('idol', 'Ídolo de Piedra', '🗿', false),
      createObj('vine', 'Liana Colgante', '🌿', false),
      createObj('machete', 'Machete de Explorador', '🗡️', false),
      createObj('snake', 'Serpiente Venenosa', '🐍', false),
      createObj('spider', 'Tarántula', '🕷️', false),
      createObj('mushroom', 'Hongo Gigante', '🍄', false),
      createObj('ruin_block', 'Bloque Arqueológico', '🪨', false),
      createObj('campfire', 'Fogata de Campamento', '🔥', false),
      createObj('log', 'Tronco Caído', '🪵', false),
      createObj('chest', 'Cofre Ancestral', '📦', false),
      createObj('flower', 'Orquídea Salvaje', '🌺', false),
    ],
    maleNames: ['Akali', 'Bram', 'Chiko', 'Dayo', 'Emeka', 'Femi', 'Gamba', 'Haruki', 'Idris', 'Jomo', 'Kojo', 'Lebo', 'Musa', 'Nkosi', 'Obinna', 'Piri', 'Quame', 'Riku', 'Seun', 'Tomi', 'Uche', 'Vito', 'Wanjiru'],
    femaleNames: ['Ama', 'Bintu', 'Chisom', 'Dede', 'Esi', 'Fatou', 'Gomo', 'Hawa', 'Isoke', 'Joyita', 'Kesia', 'Ladi', 'Mina', 'Nadia', 'Ọlá', 'Pita', 'Rima', 'Sade', 'Tola', 'Uyi', 'Vena', 'Wura', 'Yemi', 'Zuri'],
  },

  spooky: {
    id: 'spooky',
    name: 'Terrorífico',
    emoji: '👻',
    description: 'Mansiones encantadas, criaturas de la noche y maldiciones antiguas',
    gradient: 'from-purple-800 via-violet-900 to-black',
    accentColor: '#9333EA',
    zones: ['Mansión', 'Cripta', 'Cementerio', 'Laboratorio Maldito', 'Torres del Campanario', 'Sótano', 'Granero', 'Bosque Tenebroso'],
    objects: [
      // Objetos OCUPABLES
      createObj('coffin', 'Ataúd de Vampiro', '⚰️', true),
      createObj('chair', 'Sillón Victoriano', '🪑', true),
      createObj('bed', 'Cama Tenebrosa', '🛏️', true),

      // Objetos FIJOS
      createObj('tombstone', 'Lápida Gótica', '🪦', false),
      createObj('cauldron', 'Caldero Burbujeante', '🍲', false),
      createObj('bat', 'Murciélago', '🦇', false),
      createObj('spider', 'Araña Tejedora', '🕷️', false),
      createObj('candle', 'Candelabro Antiguo', '🕯️', false),
      createObj('skull', 'Calavera Hechizada', '💀', false),
      createObj('mirror', 'Espejo Roto', '🪞', false),
      createObj('poison', 'Frasco de Veneno', '☠️', false),
      createObj('trap', 'Trampa de Mordaza', '🪤', false),
      createObj('potion', 'Poción Misteriosa', '🧪', false),
    ],
    maleNames: ['Ambrose', 'Balthazar', 'Caspian', 'Dorian', 'Elias', 'Faustus', 'Gregor', 'Hector', 'Igor', 'Jasper', 'Lestat', 'Malachar', 'Nikolai', 'Orpheus', 'Phineas', 'Quillon', 'Ravenwood', 'Silas', 'Thaddeus', 'Ulric', 'Vladimir', 'Wentworth'],
    femaleNames: ['Agatha', 'Belladonna', 'Cassandra', 'Desdemona', 'Elvira', 'Freya', 'Gwendolyn', 'Hecate', 'Isadora', 'Jezebel', 'Kallista', 'Lilith', 'Morgana', 'Nightshade', 'Ophelia', 'Prudence', 'Ravenna', 'Sabrina', 'Thessaly', 'Ursula', 'Vesper', 'Winifred', 'Xena', 'Ysolde'],
  },

  detective: {
    id: 'detective',
    name: 'Detective',
    emoji: '🕵️‍♂️',
    description: 'Misterios de investigación al estilo de Sherlock Holmes y Agatha Christie',
    gradient: 'from-gray-600 via-gray-800 to-gray-900',
    accentColor: '#6B7280',
    zones: ['Salón de la Mansión', 'Biblioteca', 'Estudio', 'Laboratorio', 'Comedor', 'Habitación de Huéspedes', 'Servidumbre', 'Jardín de Invierno', 'Cobertizo'],
    objects: [
      // Objetos OCUPABLES
      createObj('armchair', 'Butaca de Tapizado', '🪑', true),
      createObj('sofa', 'Sofá de Tres Plazas', '🛋️', true),
      createObj('bed', 'Cama de Hierro Forjado', '🛏️', true),
      createObj('desk_chair', 'Silla de Escritorio', '🪑', true),

      // Objetos FIJOS
      createObj('magnifying_glass', 'Lupa de Detective', '🔍', false),
      createObj('pipe', 'Pipa de Madera', '🚬', false),
      createObj('violin', 'Violin Stradivarius', '🎻', false),
      createObj('teapot', 'Tetera de Plata', '🫖', false),
      createObj('gramophone', 'Gramófono Antiguo', '📻', false),
      createObj('fireplace', 'Chimenea de Piedra', '🔥', false),
      createObj('bookcase', 'Estantería de Roble', '📚', false),
      createObj('globe', 'Globos Terráqueo', '🌍', false),
      createObj('suit_armor', 'Armadura Medieval', '🛡️', false),
      createObj('antar', 'Antorcha de Pared', '🕯️', false),
      createObj('desk', 'Escritorio de Nogal', '🪵', false),
      createObj('clock', 'Reloj de Péndulo', '🕰️', false),
    ],
    maleNames: ['Sherlock', 'Watson', 'Holmes', 'Poirot', 'Marlowe', 'Mason', 'Dupin', 'Father', 'Montague', 'Inspector', 'Constable', 'Bryant', 'Cedric', 'Dermont', 'Ernest', 'Frederick', 'George', 'Henry', 'John', 'William'],
    femaleNames: ['Agatha', 'Miss', 'Marple', 'Villiers', 'Russell', 'Davies', 'Evans', 'Bennett', 'Clara', 'Eleanor', 'Jane', 'Ruth', 'Sara', 'Lucy', 'Anna', 'Emma', 'Sophie', 'Charlotte', 'Emily', 'Victoria'],
  },

  egypt: {
    id: 'egypt',
    name: 'Egipto',
    emoji: '🏺',
    description: 'Pirámides, tumbas selladas y conspiraciones a orillas del Nilo',
    gradient: 'from-yellow-600 via-amber-700 to-stone-900',
    accentColor: '#EAB308',
    zones: ['Pirámide', 'Templo de Amón', 'Nilo', 'Tumba Real', 'Mercado de Tebas', 'Oasis', 'Necrópolis', 'Palacio del Faraón', 'Cantera'],
    objects: [
      // Objetos OCUPABLES
      createObj('throne_eg', 'Trono del Faraón', '👑', true),
      createObj('bed_eg', 'Litera de Papiro', '🛏️', true),
      createObj('bench_eg', 'Banco de Piedra', '🪑', true),
      // Objetos FIJOS
      createObj('sphinx', 'Esfinge', '🗿', false),
      createObj('hieroglyph', 'Jeroglífico', '📜', false),
      createObj('mummy', 'Momia', '🧟', false),
      createObj('cobra', 'Cobra Real', '🐍', false),
      createObj('amphora', 'Ánfora', '🏺', false),
      createObj('palm_eg', 'Palmera del Oasis', '🌴', false),
      createObj('scarab', 'Escarabajo Dorado', '🪲', false),
      createObj('torch_eg', 'Antorcha Funeraria', '🔥', false),
      createObj('chest_eg', 'Cofre del Tesoro', '📦', false),
      createObj('statue_eg', 'Estatua de Anubis', '🐺', false),
      createObj('well_eg', 'Pozo del Nilo', '⛲', false),
    ],
    maleNames: ['Amenhotep', 'Ramsés', 'Tutankamón', 'Imhotep', 'Seti', 'Horus', 'Anubis', 'Khaemwaset', 'Ptah', 'Osiris', 'Thutmose', 'Seneb', 'Khufu', 'Djoser', 'Ahmose', 'Narmer'],
    femaleNames: ['Nefertiti', 'Cleopatra', 'Hatshepsut', 'Nefertari', 'Isis', 'Bastet', 'Sekhmet', 'Merit', 'Tiye', 'Ankhesenamón', 'Sobekneferu', 'Mut', 'Hathor', 'Kiya', 'Sitamen', 'Ahhotep'],
  },

  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    emoji: '🌃',
    description: 'Neones, androides y sabotajes en las calles de Neo-Tokyo',
    gradient: 'from-fuchsia-600 via-purple-800 to-cyan-900',
    accentColor: '#E879F9',
    zones: ['Nivel Bajo', 'Azotea', 'Arcade', 'Laboratorio Clandestino', 'Estación de Metro', 'Bar de Neón', 'Servidores', 'Taller', 'Mercado Negro'],
    objects: [
      // Objetos OCUPABLES
      createObj('capsule_cp', 'Cápsula de Carga', '❄️', true),
      createObj('gaming_chair', 'Silla Gaming', '💺', true),
      createObj('bed_cp', 'Cama Modular', '🛏️', true),
      // Objetos FIJOS
      createObj('drone', 'Dron Vigilante', '🛸', false),
      createObj('neon', 'Cartel de Neón', '💡', false),
      createObj('android', 'Androide', '🤖', false),
      createObj('terminal_cp', 'Terminal Hackeada', '💻', false),
      createObj('cable_cp', 'Maraña de Cables', '🔌', false),
      createObj('camera_cp', 'Cámara de Seguridad', '📷', false),
      createObj('bike_cp', 'Moto Voladora', '🏍️', false),
      createObj('barrel_cp', 'Bidón Tóxico', '🛢️', false),
      createObj('antenna', 'Antena Repetidora', '📡', false),
      createObj('chip', 'Chip de Datos', '💾', false),
      createObj('robot_arm', 'Brazo Robótico', '🦾', false),
    ],
    maleNames: ['Kai', 'Ryo', 'Dex', 'Juno', 'Kaito', 'Ren', 'Seth', 'Vex', 'Hiro', 'Dante', 'Kira', 'Zero', 'Jax', 'Neo', 'Enzo', 'Ravi'],
    femaleNames: ['Nova', 'Yuki', 'Akira', 'Lena', 'Mira', 'Suki', 'Vera', 'Iris', 'Cleo', 'Nadia', 'Rin', 'Saya', 'Aiko', 'Luna', 'Zoe', 'Eva'],
  },

  feudal: {
    id: 'feudal',
    name: 'Japón Feudal',
    emoji: '⛩️',
    description: 'Samuráis, pagodas y secretos entre el bambú y los cerezos',
    gradient: 'from-red-700 via-rose-800 to-stone-900',
    accentColor: '#F87171',
    zones: ['Dojo', 'Pagoda', 'Jardín Zen', 'Aldea', 'Bosque de Bambú', 'Castillo', 'Casa de Té', 'Puente', 'Armería'],
    objects: [
      // Objetos OCUPABLES
      createObj('tatami', 'Tatami', '🛖', true),
      createObj('futon', 'Futón', '🛏️', true),
      createObj('bench_jp', 'Banco de Madera', '🪑', true),
      // Objetos FIJOS
      createObj('katana', 'Katana', '🗡️', false),
      createObj('bonsai', 'Bonsái', '🌳', false),
      createObj('lantern', 'Farolillo', '🏮', false),
      createObj('shuriken', 'Shuriken', '✴️', false),
      createObj('carp', 'Carpa Koi', '🐟', false),
      createObj('cherry', 'Cerezo en Flor', '🌸', false),
      createObj('armor_jp', 'Armadura Samurái', '🛡️', false),
      createObj('scroll_jp', 'Pergamino Caligráfico', '📜', false),
      createObj('tea', 'Tetera de Té', '🍵', false),
      createObj('gong', 'Gong del Templo', '🔔', false),
      createObj('bamboo', 'Caña de Bambú', '🎋', false),
    ],
    maleNames: ['Hiroshi', 'Kenji', 'Takeshi', 'Akira', 'Daichi', 'Hayato', 'Isamu', 'Jiro', 'Katsuro', 'Masaru', 'Noboru', 'Osamu', 'Riku', 'Sora', 'Taro', 'Yuji'],
    femaleNames: ['Yuki', 'Sakura', 'Hana', 'Aiko', 'Emi', 'Keiko', 'Miyu', 'Naoko', 'Rin', 'Saki', 'Tomoe', 'Ume', 'Yoko', 'Akane', 'Chiyo', 'Haruka'],
  },

  zombie: {
    id: 'zombie',
    name: 'Apocalipsis Zombi',
    emoji: '🧟',
    description: 'Refugios, hospitales y supervivientes entre barricadas',
    gradient: 'from-lime-700 via-green-800 to-neutral-900',
    accentColor: '#A3E635',
    zones: ['Refugio', 'Hospital', 'Supermercado', 'Metro Abandonado', 'Azotea', 'Comisaría', 'Taller', 'Campamento', 'Farmacia'],
    objects: [
      // Objetos OCUPABLES
      createObj('stretcher', 'Camilla', '🛏️', true),
      createObj('sleeping_bag', 'Saco de Dormir', '🎒', true),
      createObj('chair_zb', 'Silla Plegable', '🪑', true),
      // Objetos FIJOS
      createObj('barricade', 'Barricada', '🚧', false),
      createObj('canister', 'Bidón de Gasolina', '🛢️', false),
      createObj('syringe', 'Jeringuilla', '💉', false),
      createObj('can_food', 'Lata de Conserva', '🥫', false),
      createObj('radio_zb', 'Radio a Pilas', '📻', false),
      createObj('flashlight', 'Linterna', '🔦', false),
      createObj('blood', 'Mancha de Sangre', '🩸', false),
      createObj('crowbar', 'Palanca', '⛏️', false),
      createObj('mask_zb', 'Máscara Antigás', '😷', false),
      createObj('siren', 'Sirena Rota', '🚨', false),
      createObj('bones', 'Restos Óseos', '🦴', false),
    ],
    maleNames: ['Rick', 'Daryl', 'Glenn', 'Morgan', 'Eugene', 'Carl', 'Hershel', 'Shane', 'Bob', 'Tyreese', 'Aaron', 'Gabriel', 'Spencer', 'Heath', 'Denny', 'Marcus'],
    femaleNames: ['Michonne', 'Carol', 'Maggie', 'Sasha', 'Rosita', 'Andrea', 'Beth', 'Tara', 'Enid', 'Jessie', 'Deanna', 'Lori', 'Amy', 'Elena', 'Nadia', 'Rosa'],
  },

  olympics: {
    id: 'olympics',
    name: 'Olimpiadas',
    emoji: '🏅',
    description: 'Estadios, récords y sabotajes entre la villa olímpica',
    gradient: 'from-sky-600 via-blue-700 to-indigo-900',
    accentColor: '#38BDF8',
    zones: ['Estadio', 'Piscina Olímpica', 'Gimnasio', 'Vestuario', 'Pista de Atletismo', 'Villa Olímpica', 'Podio', 'Prensa', 'Enfermería'],
    objects: [
      // Objetos OCUPABLES
      createObj('bench_ol', 'Banquillo', '🪑', true),
      createObj('stretcher_ol', 'Camilla Médica', '🛏️', true),
      createObj('podium seat', 'Grada VIP', '💺', true),
      // Objetos FIJOS
      createObj('ball', 'Balón', '⚽', false),
      createObj('trophy', 'Trofeo', '🏆', false),
      createObj('stopwatch', 'Cronómetro', '⏱️', false),
      createObj('hurdle', 'Valla', '🚧', false),
      createObj('weights', 'Pesa Olímpica', '🏋️', false),
      createObj('torch_ol', 'Antorcha Olímpica', '🔥', false),
      createObj('medal', 'Medalla de Oro', '🥇', false),
      createObj('pool_lane', 'Calle de Piscina', '🏊', false),
      createObj('racket', 'Raqueta', '🎾', false),
      createObj('flag_ol', 'Bandera', '🚩', false),
      createObj('whistle', 'Silbato', '📯', false),
    ],
    maleNames: ['Usain', 'Michael', 'Carlitos', 'Diego', 'Pau', 'Rafa', 'Iker', 'Marc', 'Leo', 'Andrés', 'Bruno', 'Hugo', 'Iván', 'Nico', 'Pablo', 'Sergio'],
    femaleNames: ['Simone', 'Mireia', 'Carolina', 'Paula', 'Lucía', 'Marta', 'Sara', 'Elena', 'Claudia', 'Julia', 'Aina', 'Laia', 'Noa', 'Vega', 'Alba', 'Irene'],
  },

  kitchen: {
    id: 'kitchen',
    name: 'Cocina',
    emoji: '🍳',
    description: 'Fogones, despensas y un sabotaje en pleno servicio',
    gradient: 'from-orange-500 via-amber-600 to-red-800',
    accentColor: '#FB923C',
    zones: ['Cocina Central', 'Comedor', 'Bodega', 'Terraza', 'Mercado', 'Pastelería', 'Despensa', 'Barra', 'Horno de Leña'],
    objects: [
      // Objetos OCUPABLES
      createObj('stool_kt', 'Taburete Alto', '🪑', true),
      createObj('bench_kt', 'Banco Corrido', '🛋️', true),
      createObj('bed_kt', 'Catre de Descanso', '🛏️', true),
      // Objetos FIJOS
      createObj('pan', 'Sartén', '🍳', false),
      createObj('knife', 'Cuchillo Chef', '🔪', false),
      createObj('pot', 'Olla a Presión', '🍲', false),
      createObj('bottle_kt', 'Botella de Vino', '🍾', false),
      createObj('cake', 'Tarta', '🍰', false),
      createObj('fridge', 'Nevera Industrial', '🧊', false),
      createObj('recipe', 'Libro de Recetas', '📖', false),
      createObj('pepper', 'Pimentero', '🧂', false),
      createObj('apple_kt', 'Cesta de Manzanas', '🍎', false),
      createObj('coffee', 'Cafetera', '☕', false),
      createObj('barrel_kt', 'Barril de Cerveza', '🍺', false),
    ],
    maleNames: ['Ferran', 'José', 'Alberto', 'Quique', 'Martín', 'Jordi', 'Pepe', 'Dabiz', 'Andoni', 'Joan', 'Paco', 'Manu', 'Diego', 'Santi', 'Oriol', 'Bruno'],
    femaleNames: ['Carme', 'Elena', 'Lucía', 'Marta', 'Anna', 'Laia', 'Clara', 'Julia', 'Sofía', 'Paula', 'Núria', 'Aina', 'Júlia', 'Maria', 'Sara', 'Eva'],
  },
}

// ============================================================
// DIFICULTADES
// ============================================================

export const DIFFICULTIES: Record<string, DifficultyInfo> = {
  easy: {
    id: 'easy',
    name: 'Principiante',
    description: 'Grid 6×6 con pistas directas. Perfecto para aprender.',
    emoji: '🌱',
    gridSize: 6,
    numCharacters: 5,
    numZones: 3,
    clueComplexity: 'simple',
    color: '#22C55E',
  },
  medium: {
    id: 'medium',
    name: 'Aventurero',
    description: 'Grid 9×9. Pistas cruzadas que requieren deducción.',
    emoji: '⚡',
    gridSize: 9,
    numCharacters: 8,
    numZones: 5,
    clueComplexity: 'moderate',
    color: '#3B82F6',
  },
  hard: {
    id: 'hard',
    name: 'Experto',
    description: 'Grid 12×12. Lógica compleja y pistas encadenadas.',
    emoji: '🔥',
    gridSize: 12,
    numCharacters: 11,
    numZones: 7,
    clueComplexity: 'complex',
    color: '#F59E0B',
  },
  expert: {
    id: 'expert',
    name: 'Maestro',
    description: 'Grid 18×18. Desafío integral de lógica avanzada.',
    emoji: '💀',
    gridSize: 18,
    numCharacters: 17,
    numZones: 10,
    clueComplexity: 'devious',
    color: '#EF4444',
  },
}

// ============================================================
// HELPERS
// ============================================================

/** Obtiene información de una temática */
export function getTheme(id: string): ThemeInfo {
  return THEMES[id] ?? THEMES.pirates
}

/** Obtiene información de una dificultad */
export function getDifficulty(id: string): DifficultyInfo {
  return DIFFICULTIES[id] ?? DIFFICULTIES.easy
}

/** Lista ordenada de temáticas */
export const THEME_LIST = Object.values(THEMES)

/** Lista ordenada de dificultades */
export const DIFFICULTY_LIST = Object.values(DIFFICULTIES)