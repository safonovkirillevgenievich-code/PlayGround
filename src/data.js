/* Avto-M Driller HDD 2.0 — data layer */

export const ROLES = [
  { id: 'operator', name: 'Машинист буровой', short: 'Машинист', icon: '◉', color: '#ff8a3d',
    desc: 'Подача, вращение и точность ведения пилотной скважины.' },
  { id: 'locator', name: 'Локаторщик', short: 'Локатор', icon: '⌖', color: '#5ed6ff',
    desc: 'Контроль положения головки и раннее обнаружение коммуникаций.' },
  { id: 'mud', name: 'Специалист по раствору', short: 'Раствор', icon: '◈', color: '#7dd3a7',
    desc: 'Параметры промывки, вынос шлама и риск выхода раствора.' },
  { id: 'mechanic', name: 'Механик', short: 'Механик', icon: '⚙', color: '#ffc94a',
    desc: 'Ресурс штанг, обслуживание установки и простои.' },
  { id: 'foreman', name: 'Бригадир', short: 'Бригадир', icon: '▲', color: '#ff7a9a',
    desc: 'Организация работ, сроки и премия за качество.' }
];

export const CANDIDATES = {
  operator: [
    { id: 'op-1', name: 'Лёня', age: 56, skill: 5, salary: 640,
      character: 'Седой и вредный. Спорит с бригадиром по любому поводу, но скважину ведёт лучше всех в смене.',
      perk: 'Ювелирная проходка', perkText: 'Минимальное отклонение от проекта, износ штанг −12%.',
      mods: { steer: 1.15, wear: 0.88 } },
    { id: 'op-2', name: 'Димон', age: 37, skill: 4, salary: 460,
      character: 'Молодой, лысый и худой. Постоянно нервничает, дёргает рычаги, но своё дело знает.',
      perk: 'Нервный темп', perkText: 'Быстрее реагирует на уклон, но резкие команды ускоряют износ штанг.',
      mods: { steer: 1.3, wear: 1.12 } },
    { id: 'op-3', name: 'Вовэлло', age: 58, skill: 2, salary: 300,
      character: 'Большой и тучный, как медведь. Сам почти не смотрит на приборы — работает за счёт локаторщика.',
      perk: 'Работа по локатору', perkText: 'С сильным локаторщиком ведёт ровно, без него теряет траекторию.',
      mods: { locatorAssist: 1 } }
  ],
  locator: [
    { id: 'lc-1', name: 'Серый', age: 40, skill: 5, salary: 620,
      character: 'Большой и толстый, орёт на всю площадку и постоянно ест тортики. Но сигнал читает лучше всех.',
      perk: 'Громкий сигнал', perkText: 'Находит неизвестные коммуникации раньше и точнее, но нервирует бригаду.',
      mods: { detect: 1.6, noise: 0.8 } },
    { id: 'lc-2', name: 'Кирилл', skill: 5, salary: 560,
      character: 'Очень нервный, за всё переживает. При этом сильный специалист и разбирается во всём.',
      perk: 'Полный контроль', perkText: 'Минимальная погрешность глубины и уверенное обнаружение сетей.',
      mods: { noise: 0.6, detect: 1.25 } },
    { id: 'lc-3', name: 'Макс', age: 38, skill: 4, salary: 420,
      character: 'Крепкий жилистый парень. Лучше всего работает в ручном режиме, без лазерной разметки.',
      perk: 'Ручной режим', perkText: 'Без лазера точнее держит траекторию и снижает штраф за отклонение.',
      mods: { manual: 1, noise: 0.9 } }
  ],
  mud: [
    { id: 'md-1', name: 'Ольга Ким', skill: 5, salary: 450,
      perk: 'Стабильная промывка', perkText: 'Окно давления шире на 12 бар.',
      mods: { window: 12 } },
    { id: 'md-2', name: 'Виктор Демин', skill: 4, salary: 330,
      perk: 'Экономия', perkText: 'Расход раствора и добавок −20%.',
      mods: { save: 0.8 } },
    { id: 'md-3', name: 'Роман Шевчук', skill: 3, salary: 240,
      perk: 'Практик', perkText: 'Ровная работа насоса без бонусов.',
      mods: {} },
    { id: 'md-4', name: 'Назар', skill: 5, salary: 470,
      character: 'Спокойный полевой технолог: сначала проверит грунт и воду, потом даст насосам нагрузку.',
      perk: 'Запас по давлению', perkText: 'Окно безопасного давления шире на 8 бар.',
      mods: { window: 8 } },
    { id: 'md-5', name: 'Витямба', skill: 4, salary: 350,
      character: 'Весёлый экспериментатор, который помнит каждую свою замесь и не льёт добавки на глаз.',
      perk: 'Точная замесь', perkText: 'Расход раствора и добавок −15%.',
      mods: { save: 0.85 } },
    { id: 'md-6', name: 'Вовчански', skill: 4, salary: 390,
      character: 'Немногословный специалист по тяжёлым грунтам; при гравии и скале заранее бережёт запас давления.',
      perk: 'Экономный тяжёлый контур', perkText: 'Окно давления шире на 6 бар, расход раствора и добавок −10%.',
      mods: { window: 6, save: 0.9 } }
  ],
  mechanic: [
    { id: 'mc-1', name: 'Николай Бондарь', skill: 5, salary: 450,
      perk: 'Ресурс техники', perkText: 'Износ штанг −30%, реже внеплановые ремонты.',
      mods: { wear: 0.7 } },
    { id: 'mc-2', name: 'Артём Егоров', skill: 4, salary: 330,
      perk: 'Быстрый ремонт', perkText: 'Простои при ремонте −40%.',
      mods: { repair: 0.6 } },
    { id: 'mc-3', name: 'Данила Крылов', skill: 3, salary: 220,
      perk: 'Дешёвое обслуживание', perkText: 'Стоимость ремонтов −25%.',
      mods: { repairCost: 0.75 } },
    { id: 'mc-4', name: 'Алексей Михайлович', skill: 5, salary: 480,
      character: 'Старой школы: перед сменой лично проверяет каждую штангу и не терпит работы на изношенном инструменте.',
      perk: 'Бережный привод', perkText: 'Износ штанг −22%, аварийный ремонт дешевле на 10%.',
      mods: { wear: 0.78, repairCost: 0.9 } },
    { id: 'mc-5', name: 'Максим Петрович', skill: 4, salary: 400,
      character: 'На площадке всегда с ящиком инструмента; чинит на ходу и быстро возвращает установку в работу.',
      perk: 'Ремонт без простоя', perkText: 'Простои при ремонте −30%, но обслуживание обходится немного дороже.',
      mods: { repair: 0.7, repairCost: 1.08 } }
  ],
  foreman: [
    { id: 'fm-1', name: 'Кирилл', skill: 5, salary: 640,
      character: 'Тот же Кирилл, что и локаторщик. Разбирается во всех тонкостях и остаётся самым сильным специалистом бригады.',
      perk: 'Универсал', perkText: 'Понимает бурение, раствор и локацию. Премия за качество +12%.',
      mods: { bonus: 1.12 } },
    { id: 'fm-2', name: 'Пётр Михайлович', age: 54, skill: 3, salary: 600,
      character: 'В бурении не разбирается, зато лучший организатор работ. Много кричит и обзывает, но смену держит в руках.',
      perk: 'Организатор', perkText: 'Лучшая организация работ и меньше простоев, но в технике не поможет.',
      mods: { bonus: 1.06, time: 0.55 } },
    { id: 'fm-3', name: 'Юрчик', age: 58, skill: 4, salary: 460,
      character: 'Самый опытный, стаж 25 лет. Постоянно спешит и хуже всех работает с раствором.',
      perk: 'Опыт и спешка', perkText: 'Быстро ведёт смену, но окно давления уже: риск выхода раствора выше.',
      mods: { bonus: 1.04, mudPenalty: 8, rush: 1 } }
  ]
};

export const ROLE_BY_ID = Object.fromEntries(ROLES.map(r => [r.id, r]));

export const SOILS = {
  loam: { name: 'Суглинок', short: 'Суглинок', speed: 1.0, ream: 1.0, mud: 0, color: '#6b553d',
    note: 'Устойчивый грунт, предсказуемая проходка.' },
  sand: { name: 'Песок', short: 'Песок', speed: 1.08, ream: 0.92, mud: 5, color: '#8d7754',
    note: 'Быстро бурится, но склонен к осыпанию и потере раствора.' },
  clay: { name: 'Плотная глина', short: 'Глина', speed: 0.9, ream: 1.1, mud: -3, color: '#5d4a3a',
    note: 'Медленно, зато стенка держится и промывка стабильна.' },
  gravel: { name: 'Гравий', short: 'Гравий', speed: 0.8, ream: 1.3, mud: 7, color: '#7d6a50',
    note: 'Высокая нагрузка на расширитель и риск потери бурового раствора.' },
  rock: { name: 'Скальный грунт', short: 'Скала', speed: 0.68, ream: 1.5, mud: -5, color: '#55545a',
    note: 'Требует запаса по тяге и контроля температуры инструмента.' }
};

export const MIXES = {
  polymer: { id: 'polymer', name: 'Полимерный раствор', cost: 2400, window: 14, clean: 1.16,
    note: 'Стабильная стенка, широкое окно давления. Дорого.' },
  bentonite: { id: 'bentonite', name: 'Бентонитовый раствор', cost: 1200, window: 7, clean: 1.0,
    note: 'Рабочий вариант для большинства грунтов.' },
  water: { id: 'water', name: 'Техническая вода', cost: 400, window: -7, clean: 0.72,
    note: 'Дёшево, но слабый вынос шлама и высокий риск выхода раствора.' }
};

export const SWIVELS = [
  { id: 'compact', name: 'Компактный вертлюг', capacity: 72, cost: 900, bearing: 1.08,
    hint: 'Лёгкий и недорогой, подходит для спокойной протяжки.' },
  { id: 'standard', name: 'Усиленный вертлюг', capacity: 92, cost: 1750, bearing: 1,
    hint: 'Рабочий баланс грузоподъёмности и ресурса подшипника.' },
  { id: 'heavy', name: 'Тяжёлый вертлюг', capacity: 112, cost: 2900, bearing: 0.88,
    hint: 'Большой запас по усилию и усиленный подшипник для снижения нагрева.' }
];

// Ориентир замеса и конечный запас бентонита на 100 м проходки.
export const MUD_RECIPES = {
  loam: { soil: 'loam', mix: 'bentonite', bentoniteAllowanceKgPer100m: 42, bentoniteUseKgPer100m: 26,
    polymerLPer100m: 0, hint: 'Базовая бентонитовая суспензия; поддерживайте равномерный вынос шлама.' },
  sand: { soil: 'sand', mix: 'polymer', bentoniteAllowanceKgPer100m: 65, bentoniteUseKgPer100m: 50,
    polymerLPer100m: 18, hint: 'Усиленная стабилизация стенок и запас раствора против осыпания и поглощения.' },
  clay: { soil: 'clay', mix: 'bentonite', bentoniteAllowanceKgPer100m: 36, bentoniteUseKgPer100m: 22,
    polymerLPer100m: 4, hint: 'Умеренная вязкость: не завышайте подачу в плотной глине.' },
  gravel: { soil: 'gravel', mix: 'polymer', bentoniteAllowanceKgPer100m: 76, bentoniteUseKgPer100m: 62,
    polymerLPer100m: 24, hint: 'Резерв для выноса крупного шлама и компенсации возможных потерь.' },
  rock: { soil: 'rock', mix: 'bentonite', bentoniteAllowanceKgPer100m: 48, bentoniteUseKgPer100m: 34,
    polymerLPer100m: 10, hint: 'Стабильная несущая суспензия; следите за циркуляцией и температурой инструмента.' }
};

const LAYER_PALETTES = {
  loam: {
    tops: [0, 0.65, 2.5, 4.9, 7.4, 11],
    colors: ['#554430', '#6b553d', '#836b4c', '#5d4c3b', '#45392e', '#332c25'],
    names: ['Почвенный слой', 'Суглинок', 'Песчаный прослой', 'Плотная глина', 'Мергель', 'Материнская порода'],
    hardness: [0.8, 1, 1.1, 1.15, 1.3, 1.4]
  },
  sand: {
    tops: [0, 0.55, 2.1, 4.4, 7.0, 11],
    colors: ['#5b4a34', '#91795a', '#a38a66', '#7c684e', '#514334', '#38302a'],
    names: ['Почвенный слой', 'Мелкий песок', 'Песок с гравием', 'Суглинок', 'Глина', 'Материнская порода'],
    hardness: [0.85, 0.95, 1.05, 1.1, 1.25, 1.35]
  },
  clay: {
    tops: [0, 0.6, 1.9, 4.2, 6.8, 11],
    colors: ['#51432f', '#66513e', '#5a4737', '#4a3b30', '#3b3028', '#2c2621'],
    names: ['Почвенный слой', 'Тугопластичная глина', 'Плотная глина', 'Сланцеватая глина', 'Мергель', 'Материнская порода'],
    hardness: [0.85, 0.95, 1.05, 1.15, 1.3, 1.4]
  },
  gravel: {
    tops: [0, 0.55, 1.8, 3.8, 6.2, 11],
    colors: ['#5c4b35', '#8a7353', '#756348', '#685740', '#4c4033', '#36302a'],
    names: ['Почвенный слой', 'Гравийный грунт', 'Гравий с валунами', 'Песчано-гравийная смесь', 'Глина', 'Материнская порода'],
    hardness: [0.85, 1.1, 1.25, 1.3, 1.2, 1.35]
  },
  rock: {
    tops: [0, 0.5, 1.7, 3.5, 5.7, 11],
    colors: ['#53452f', '#6a5742', '#7a6850', '#5b5555', '#48474e', '#35343b'],
    names: ['Почвенный слой', 'Суглинок с щебнем', 'Выветрелый сланец', 'Скальный грунт', 'Плотный сланец', 'Материнская порода'],
    hardness: [0.8, 1.05, 1.25, 1.6, 1.7, 1.8]
  }
};

export function buildLayers(soil) {
  const p = LAYER_PALETTES[soil] || LAYER_PALETTES.loam;
  return p.tops.slice(0, -1).map((top, i) => ({
    name: p.names[i], top, bottom: p.tops[i + 1], color: p.colors[i], hardness: p.hardness[i]
  }));
}

export const UTILITY_TYPES = {
  electric: { label: 'Кабель 10 кВ', color: '#ffd23f', size: 0.12, short: 'ЭЛ' },
  gas: { label: 'Газопровод Ø200', color: '#ffb000', size: 0.20, short: 'ГАЗ' },
  water: { label: 'Водопровод Ø300', color: '#4ea8ff', size: 0.30, short: 'ВОД' },
  fiber: { label: 'Оптоволокно', color: '#c77dff', size: 0.10, short: 'ОПТ' },
  sewer: { label: 'Канализация Ø400', color: '#7dd3a7', size: 0.40, short: 'КАН' }
};

export const CONTRACTS = [
  {
    id: 'c1',
    code: 'AM-2081',
    title: 'Коттеджный посёлок «Сосновый»',
    client: 'СЗ «Сосновый бор»',
    product: 'Кабель 10 кВ в ПНД-трубе',
    od: 110,
    length: 85,
    entryDepth: 0.7,
    exitDepth: 3.2,
    maxDepth: 5.4,
    soil: 'loam',
    payout: 24500,
    par: 210,
    difficulty: 1,
    utilities: [
      { x: 16, offset: -2.1, type: 'electric', documented: true },
      { x: 38, offset: 1.15, type: 'water', documented: true },
      { x: 58, offset: -1.05, type: 'gas', documented: true },
      { x: 72, offset: -1.8, type: 'fiber', documented: false }
    ],
    brief: 'Плановый ввод электричества к шести участкам. Есть архивные схемы сетей, но оптика на объекте не учтена.'
  },
  {
    id: 'c2',
    code: 'AM-2094',
    title: 'ТЦ «Северный» — водопровод',
    client: 'ООО «Северстрой»',
    product: 'ПЭ100 Ø160 SDR17',
    od: 160,
    length: 140,
    entryDepth: 0.8,
    exitDepth: 3.6,
    maxDepth: 6.4,
    soil: 'sand',
    payout: 43000,
    par: 330,
    difficulty: 2,
    utilities: [
      { x: 24, offset: -2.0, type: 'electric', documented: true },
      { x: 52, offset: 1.15, type: 'water', documented: true },
      { x: 78, offset: -1.15, type: 'gas', documented: true },
      { x: 112, offset: 1.5, type: 'sewer', documented: false }
    ],
    brief: 'Подключение торгового центра к городской сети. Песчаный грунт, рядом действующий газопровод и ливневка.'
  },
  {
    id: 'c3',
    code: 'AM-2117',
    title: 'Промзона «Восток» — канализация',
    client: 'АО «Восток-Индустрия»',
    product: 'ПЭ100 Ø250 SDR21',
    od: 250,
    length: 210,
    entryDepth: 0.9,
    exitDepth: 4.2,
    maxDepth: 7.0,
    soil: 'rock',
    payout: 69000,
    par: 520,
    difficulty: 3,
    utilities: [
      { x: 30, offset: -1.1, type: 'electric', documented: true },
      { x: 64, offset: 1.1, type: 'gas', documented: true },
      { x: 96, offset: -1.2, type: 'water', documented: true },
      { x: 132, offset: 1.3, type: 'sewer', documented: true },
      { x: 176, offset: -2.1, type: 'fiber', documented: false }
    ],
    brief: 'Глубокий коллектор под действующей промзоной. Скальный грунт, плотный трафик коммуникаций, высокие ставки.'
  }
];

export function designDepthAt(c, x) {
  const t = Math.max(0, Math.min(1, x / c.length));
  const s = t * t * (3 - 2 * t);
  const base = c.entryDepth + (c.exitDepth - c.entryDepth) * s;
  const amp = Math.max(0.4, c.maxDepth - (c.entryDepth + c.exitDepth) / 2);
  return base + Math.pow(Math.sin(Math.PI * t), 1.15) * amp;
}

export function buildDesign(c) {
  const pts = [];
  for (let x = 0; x <= c.length + 0.001; x += 1) {
    pts.push({ x, d: designDepthAt(c, x) });
  }
  return pts;
}

export function prepareContract(c) {
  if (c._ready) return c;
  c.design = buildDesign(c);
  c.layers = buildLayers(c.soil);
  c.utilities = c.utilities.map((u, i) => {
    const depth = Math.max(0.8, designDepthAt(c, u.x) + u.offset);
    const type = UTILITY_TYPES[u.type];
    return {
      ...u,
      id: `u${i + 1}`,
      depth,
      label: type.label,
      color: type.color,
      size: type.size,
      clearance: 0.55 + type.size,
      hit: false
    };
  });
  c.reamers = makeReamers(c);
  c._ready = true;
  return c;
}

export function makeReamers(c) {
  const base = c.od;
  const opts = [
    { id: 'r1', type: 'standard', ratio: 1.1, name: 'Компактный', cost: 1400,
      load: 1.1, soilSuitability: ['loam', 'sand', 'clay', 'gravel', 'rock'],
      hint: 'Легче тянуть на расширении, но высокий риск затяжки трубы.' },
    { id: 'r2', type: 'standard', ratio: 1.35, name: 'Расчётный', cost: 2100,
      load: 1.35, soilSuitability: ['loam', 'sand', 'clay', 'gravel', 'rock'],
      hint: 'Оптимальный компромисс диаметра скважины и нагрузки для большинства грунтов.' },
    { id: 'r3', type: 'standard', ratio: 1.7, name: 'Усиленный', cost: 2900,
      load: 1.7, soilSuitability: ['loam', 'sand', 'clay', 'gravel', 'rock'],
      hint: 'Большой диаметр скважины, но выше нагрузка на установку и риск выхода раствора.' }
  ];
  if (c.soil === 'sand') {
    opts.push(
      { id: 'sand-cutter', type: 'sand-cutting', ratio: 1.25, name: 'Пескорезный расширитель', cost: 2450,
        load: 1.18, soilSuitability: ['sand'],
        hint: 'Режущие кромки разрыхляют плотные песчаные прослои; снижает риск затяжки, но требует устойчивой промывки.' },
      { id: 'sand-barrel', type: 'sand-barrel', ratio: 1.5, name: 'Песчаный бочонок', cost: 3150,
        load: 1.32, soilSuitability: ['sand'],
        hint: 'Бочонковый корпус удерживает стенку песчаной скважины при расширении; выше тяговая нагрузка.' }
    );
  }
  return opts.map(o => ({
    ...o,
    dia: Math.round(base * o.ratio / 10) * 10
  }));
}

export const DIFFICULTY = ['', 'Простой', 'Средний', 'Сложный'];
export const DIFFICULTY_COLOR = ['', '#7dd3a7', '#ffc94a', '#ff7a6b'];


