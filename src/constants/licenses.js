import { Globe, ShieldCheck, Lock } from "lucide-react";

export const LICENSES = [
    {
        id: "all-rights-reserved",
        name: "保留所有權利",
        short: "All Rights Reserved",
        url: "",
        icon: Lock,
        color: "bg-slate-700",
        description: "預設選項。未經許可，他人不得使用、改作或散布您的作品。"
    },
    {
        id: "cc-by",
        name: "姓名標示",
        short: "CC BY 4.0",
        url: "https://creativecommons.org/licenses/by/4.0/deed.zh_TW",
        icon: Globe,
        color: "bg-green-600",
        description: "只要標示您的姓名，他人即可分享、改作您的作品，甚至用於商業用途。"
    },
    {
        id: "cc-by-sa",
        name: "姓名標示-相同方式分享",
        short: "CC BY-SA 4.0",
        url: "https://creativecommons.org/licenses/by-sa/4.0/deed.zh_TW",
        icon: Globe,
        color: "bg-green-600",
        description: "只要標示姓名且以相同授權釋出，他人即可分享、改作您的作品(含商用)。"
    },
    {
        id: "cc-by-nc",
        name: "姓名標示-非商業性",
        short: "CC BY-NC 4.0",
        url: "https://creativecommons.org/licenses/by-nc/4.0/deed.zh_TW",
        icon: ShieldCheck,
        color: "bg-yellow-600",
        description: "只要標示姓名且不用於商業用途，他人即可分享、改作您的作品。"
    },
    {
        id: "cc-by-nc-sa",
        name: "姓名標示-非商業性-相同方式分享",
        short: "CC BY-NC-SA 4.0",
        url: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh_TW",
        icon: ShieldCheck,
        color: "bg-yellow-600",
        description: "最嚴格的 CC 授權。僅限非商業用途，且必須以相同方式分享。"
    },
    {
        id: "cc-by-nd",
        name: "姓名標示-禁止改作",
        short: "CC BY-ND 4.0",
        url: "https://creativecommons.org/licenses/by-nd/4.0/deed.zh_TW",
        icon: Lock,
        color: "bg-red-600",
        description: "只要標示姓名且不進行改作，他人即可分享您的原樣作品(含商用)。"
    },
    {
        id: "cc-by-nc-nd",
        name: "姓名標示-非商業性-禁止改作",
        short: "CC BY-NC-ND 4.0",
        url: "https://creativecommons.org/licenses/by-nc-nd/4.0/deed.zh_TW",
        icon: Lock,
        color: "bg-red-600",
        description: "他人僅能下載並分享您的作品，且需標示姓名、不得改作或用於商業用途。"
    },
    {
        id: "cc0",
        name: "公眾領域貢獻宣告",
        short: "CC0 1.0",
        url: "https://creativecommons.org/publicdomain/zero/1.0/deed.zh_TW",
        icon: Globe,
        color: "bg-blue-600",
        description: "放棄所有權利，將作品貢獻至公眾領域。他人可無條件自由使用。"
    }
];
