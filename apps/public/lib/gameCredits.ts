// Public credits verified on Steam or in announcements from the production team.
export const gameCreditProfiles = {
  risako: { id: "f878d56b-5077-418b-a15c-6755e65f7018", name: "伊橙" },
  wanwan: { id: "826f24e7-1fac-4718-8ac4-c7682eb8bffb", name: "晚晚" },
  saya: { id: "da53e2d9-d47f-43e6-92d7-2ff3f92a734c", name: "紗耶" },
} as const;

export const gameCreditCategories = ["配音", "美術", "音樂", "音效", "後製", "錄音"] as const;
export type GameCreditCategory = (typeof gameCreditCategories)[number];

export interface GameCredit {
  category: GameCreditCategory;
  role: string;
  attribution: string;
  sourceUrl: string;
  sourceLabel?: string;
  profile?: keyof typeof gameCreditProfiles;
  personaId?: string;
  creditedAs?: string;
}

export function gameCreditIdentity(credit: GameCredit) {
  if (credit.personaId && credit.creditedAs) return { id: credit.personaId, name: credit.creditedAs };
  return credit.profile ? gameCreditProfiles[credit.profile] : undefined;
}

export interface GameCreditsEntry {
  appId: string;
  title: string;
  screenshotUrl: string;
  performers?: readonly string[];
  credits: GameCredit[];
}

export const gameCredits: GameCreditsEntry[] = [
  { appId: "1741040", title: "末代君主",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1741040/ss_af1eecb447f058996d57fa3561fc373b1747ab90.600x338.jpg?t=1782937116",
    performers: ["伊橙", "紗耶"],
    credits: [
      { category: "配音", role: "配音", attribution: "伊橙（莉薇亞、夏洛蒂）", sourceLabel: "霓聲工作室公告存檔", sourceUrl: "https://buhitter.com/search?q=%E7%8E%A9%E6%A8%82", profile: "risako" },
      { category: "配音", role: "配音", attribution: "紗耶（凱拉、米婭）", sourceLabel: "霓聲工作室公告存檔", sourceUrl: "https://buhitter.com/search?q=%E7%8E%A9%E6%A8%82", profile: "saya" },
      { category: "後製", role: "後製", attribution: "Plug&Play Studio 隨興玩樂音樂工作室", sourceLabel: "霓聲工作室公告存檔", sourceUrl: "https://buhitter.com/search?q=%E7%8E%A9%E6%A8%82" },
      { category: "音樂", role: "音樂", attribution: "PYKAMIA", sourceUrl: "https://store.steampowered.com/app/2341730/_Soundtrack/?l=tchinese" },
    ],
  },
  { appId: "4079620", title: "潔姊不要停",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4079620/30cf671a9f3ce4cbe12ea7dc11c3ed59bc42b518/ss_30cf671a9f3ce4cbe12ea7dc11c3ed59bc42b518.600x338.jpg?t=1786062897",
    performers: ["阿緯本緯", "晚晚", "蠢蠢"],
    credits: [
      { category: "配音", role: "配音", attribution: "阿緯本緯（陳以偉）", sourceUrl: "https://store.steampowered.com/app/4079620/_/?l=tchinese" },
      { category: "配音", role: "配音", attribution: "晚晚（高璐潔、趙淑華）", sourceUrl: "https://store.steampowered.com/app/4079620/_/?l=tchinese", profile: "wanwan" },
      { category: "配音", role: "配音", attribution: "蠢蠢（溫童斌）", sourceUrl: "https://store.steampowered.com/app/4079620/_/?l=tchinese" },
      { category: "配音", role: "聲音導演", attribution: "玖條Ｑ太郎", sourceUrl: "https://store.steampowered.com/app/4079620/_/?l=tchinese" },
    ],
  },
  { appId: "1683430", title: "冥婚交友中心",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1683430/ss_d6580277cdc4a18c3426b9daa4679e9a9148c0af.600x338.jpg?t=1745896971",
    performers: ["菜菜", "年糕", "香草奈若"],
    credits: [],
  },
  { appId: "2976870", title: "台灣戀愛物語⁵",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2976870/ss_34312fc874e6c0d2a6ed1ce209a96c49d37e149f.600x338.jpg?t=1792139213",
    credits: [
      { category: "音樂", role: "音樂", attribution: "苦瓜（作曲／編曲）、蘇卿（作詞）", sourceUrl: "https://store.steampowered.com/app/3033250/Taiwan_Love_Story5_Soundtrack/?l=tchinese" },
    ],
  },
  { appId: "1671510", title: "Like an Angel",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1671510/ss_25f5b6808d658c24470fd4562d88333cebbdaf39.600x338.jpg?t=1648019125",
    credits: [
      { category: "美術", role: "美術", attribution: "白夜BYA（主繪）、Nekona（指導）、乂布四維、陳國豪、Zingco Kang、兎未枝、PichiＭa", sourceUrl: "https://store.steampowered.com/app/1671510/" },
      { category: "音樂", role: "音樂", attribution: "Nyubor（配樂）、計畫通行（主題曲）、薛南（作詞）", sourceUrl: "https://store.steampowered.com/app/1671510/" },
    ],
  },
  { appId: "570840", title: "家有大貓",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/570840/ss_103870df9488ac2d81fbab667a51c5b96e9e4a6a.600x338.jpg?t=1761909062",
    credits: [
      { category: "音效", role: "音效", attribution: "Lightrain Music、小森平", sourceUrl: "https://store.steampowered.com/app/570840/_Nekojishi/?l=tchinese" },
      { category: "音樂", role: "音樂", attribution: "Triodust、KuensanP（作曲／編曲）、Paroto（演唱）", sourceUrl: "https://store.steampowered.com/app/769180/" },
      { category: "後製", role: "後製", attribution: "3R2（母帶後製）", sourceUrl: "https://store.steampowered.com/app/769180/" },
    ],
  },
  { appId: "1757490", title: "女拳主義F-ist！",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1757490/ss_cb3c9c89547a593b1a557f6acbcc39402de7217a.600x338.jpg?t=1724074956",
    performers: ["伊橙", "柔依", "霏筱雨"],
    credits: [
      { category: "音樂", role: "音樂", attribution: "GX-Striker", sourceUrl: "https://store.steampowered.com/app/2092120/Waifu_Fighter_Soundtrack/?l=tchinese" },
    ],
  },
  { appId: "2458860", title: "夏色四葉草",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2458860/ss_031d24a28bd2cef5d3d047a96af3ca5d44b87f87.600x338.jpg?t=1787936457",
    credits: [
      { category: "音樂", role: "音樂", attribution: "PYKAMIA、ANE、Yutakako、10lulu、薛南（演唱）、Ayame（作詞）", sourceUrl: "https://store.steampowered.com/app/3001960/Summer_Clover_Soundtrack/" },
      { category: "後製", role: "後製", attribution: "XinG（編曲／混音）", sourceUrl: "https://store.steampowered.com/app/3001960/Summer_Clover_Soundtrack/" },
    ],
  },
  { appId: "1837230", title: "赫雷斯的角鬥場Ⅱ",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1837230/ss_6a355c686e70020f63548bdc35c798d562e7ff94.600x338.jpg?t=1745897221",
    credits: [
      { category: "音樂", role: "音樂", attribution: "XinG、Toki（作曲／編曲）、薛南（作詞／演唱）", sourceUrl: "https://store.steampowered.com/app/1899020/_II_Original_Sountrack/?l=polish" },
      { category: "後製", role: "後製", attribution: "XinG（混音／母帶後製）", sourceUrl: "https://store.steampowered.com/app/1899020/_II_Original_Sountrack/?l=polish" },
    ],
  },
  { appId: "2875610", title: "赫雷斯的角鬥場 Ⅲ",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2875610/ss_b3edfe43aba6ed1dd1c541c81d8fb92490a9c909.600x338.jpg?t=1783651488",
    credits: [
      { category: "音樂", role: "音樂", attribution: "TT Kao", sourceUrl: "https://store.steampowered.com/app/3709900/?l=tchinese" },
    ],
  },
  { appId: "1793250", title: "帶我去地下城吧！！",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1793250/ss_e14a716b10224c3c6efcadd783c3b9dc86ebb6ff.600x338.jpg?t=1785258791",
    credits: [
      { category: "音樂", role: "音樂", attribution: "PYKAMIA", sourceUrl: "https://store.steampowered.com/app/2475070/__Soundtrack/?l=tchinese" },
    ],
  },
  { appId: "1854250", title: "惡魔調酒師",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1854250/ss_7c8d85df9af223a0d9dcae32f761a5880bbd05cc.600x338.jpg?t=1783975943",
    credits: [
      { category: "音樂", role: "音樂", attribution: "椎名神鬱", sourceUrl: "https://store.steampowered.com/app/1987370/?l=tchinese" },
    ],
  },
  { appId: "2273420", title: "管理員的窺視",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2273420/ss_ea9089b7c39ea7de9114318df188eff19af664a8.600x338.jpg?t=1769048992",
    credits: [
      { category: "音樂", role: "音樂", attribution: "HornyDoge Studio", sourceUrl: "https://store.steampowered.com/app/2714790/?l=tchinese" },
    ],
  },
  { appId: "2053940", title: "與經紀人戀愛是絕對禁止2",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2053940/ss_ff7424be58553e270a299f74ab69a83bd861abc8.600x338.jpg?t=1764132722",
    credits: [],
  },
  { appId: "1953780", title: "純愛貓娘的同居生活",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1953780/ss_40854bb34ca2ff9b1f9794642e3e7c337ed369dd.600x338.jpg?t=1725000964",
    credits: [
      { category: "音樂", role: "音樂", attribution: "娜娜子喵、JeetSingh、Akira Chang、藤村莉央、Edward（水果）", sourceUrl: "https://store.steampowered.com/app/2174630/_Soundtrack/?curator_clanid=42277193" },
    ],
  },
  { appId: "2455140", title: "魅惑之翼：少女的爆衣攻略",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2455140/ss_34144e063ac825a3bd8657f11ef6efe1255a8a41.600x338.jpg?t=1795006592",
    credits: [
      { category: "音樂", role: "音樂", attribution: "YenHuan", sourceUrl: "https://store.steampowered.com/app/2716860/Wings_of_Seduction_Original_Soundtrack/?l=german" },
    ],
  },
  { appId: "3628950", title: "魅魔繼承者：黛莉菈的淫欲冒險",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3628950/2caa956a052e345b96f1bf1f2f05505c56d77406/ss_2caa956a052e345b96f1bf1f2f05505c56d77406.600x338.jpg?t=1795006589",
    credits: [
      { category: "音樂", role: "音樂", attribution: "Turnsound", sourceUrl: "https://store.steampowered.com/app/4644250/" },
    ],
  },
  { appId: "3576350", title: "修幹嘛？二手3C店的闇營業",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3576350/4919669d353d5c58dc7e92c9556671cc12fe0f5b/ss_4919669d353d5c58dc7e92c9556671cc12fe0f5b.600x338.jpg?t=1790694689",
    credits: [
      { category: "音樂", role: "音樂", attribution: "shuan2lin、獨流阿頂", sourceUrl: "https://store.steampowered.com/app/4687230/" },
    ],
  },
  { appId: "1477810", title: "A.I.愛諾－機娘育成方程式",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1477810/ss_fac7578f1ffc0aacd145b760f7dd7815a153a111.600x338.jpg?t=1730718165",
    credits: [
      { category: "音樂", role: "音樂", attribution: "Shang Feng Yang（楊尚峰）、Barance Studio", sourceUrl: "https://store.steampowered.com/app/1659770/AI/?l=tchinese" },
    ],
  },
  { appId: "2090810", title: "超能X天使",
    screenshotUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2090810/ss_16a204fc46a85163d740a3f62a23a581ec910b92.600x338.jpg?t=1726335949",
    credits: [
      { category: "音樂", role: "音樂", attribution: "PYKAMIA、Earliri、維尼Narsil、XinG、Ice、Silaver、Kiva Wu、Yutakako", sourceUrl: "https://store.steampowered.com/app/2949340/X_OST/?l=tchinese" },
    ],
  },
];

export const additionalGameScreenshots: Readonly<Record<string, string>> = {
  "1129540": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1129540/ss_297580508d3e229a9cc3e16001e7cb9ad043bebe.600x338.jpg?t=1730717444",
  "1658310": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1658310/ss_c0997ce4d8cadbdb2dc4a7875612d88666dda6b1.600x338.jpg?t=1725000860",
  "1848270": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1848270/ss_0fdfcbd7dbadfe69dd3a7339c89fe0652ef4d9ae.600x338.jpg?t=1725000884",
  "1894080": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1894080/ss_b6b05ce68531e623103d9894e6134be0b52e56d9.600x338.jpg?t=1792295476",
  "2019680": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2019680/ss_f1421c03d208258cf232de605f8ce2d82ca791d4.600x338.jpg?t=1783372635",
  "2143540": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2143540/ss_b946d93601fa1627f4c4cf425e0950a5a30f4913.600x338.jpg?t=1725000949",
  "2176570": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2176570/ss_f4df38aa4d304e55c7ab879e717cff44f5441f2f.600x338.jpg?t=1725000913",
  "2289720": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2289720/ss_efe648f89c090ae902503537b3ddcd3070b3ef9c.600x338.jpg?t=1766072008",
  "2460070": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2460070/ss_4bc6a30d32c2a400e6ceeb234d48e07e6e42b41d.600x338.jpg?t=1792139363",
  "2613010": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2613010/ss_fa8c065cb6d0cd8f636594f30355cbcff8ebdb3e.600x338.jpg?t=1725000879",
  "2822030": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2822030/ss_cf68a97ed7855038ff6679aaf3f3136456ea0c85.600x338.jpg?t=1725000902",
  "2962420": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2962420/ss_e49c74880a65fe074a4999280ac66ea055965381.600x338.jpg?t=1742551526",
  "3044740": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3044740/926b4529c8ac7726b06cea87a0618e7bcdb2402d/ss_926b4529c8ac7726b06cea87a0618e7bcdb2402d.600x338.jpg?t=1769150542",
  "3571750": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3571750/4d391c1f792ea8c0da815e5d55a804fa5b2de764/ss_4d391c1f792ea8c0da815e5d55a804fa5b2de764.600x338.jpg?t=1763814145"
};
