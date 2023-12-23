import { NullableString } from "./utilities.js"

interface CandiDate {
    [key: string]: { [key: string]: CandiDay[] }
};

interface CandiDay {
    targetDate: Date;
    title: NullableString
}

const candidates: CandiDate = {
    "2023": {
        "12": [{
            targetDate: new Date("2023-12-31T23:59:00"),
            title: "🎉 New Year",
        }]
    },
    "2024": {
        "1": [{
            targetDate: new Date("2024-01-19T00:00:00"),
            title: "🎿 Olympics"
        }],
        "5": [{
            targetDate: new Date("2024-05-07T00:00:00Z"),
            title: "🇪🇺🎶 Eurovision"
        }],
        "6": [{
            targetDate: new Date("2024-06-20T20:51:00Z"),
            title: "☀️ Solstice"
        }],
        "9": [{
            targetDate: new Date("2024-12-21T09:20:00Z"),
            title: "🥶 Solstice",
        }]
    },
    "2025": {
        "1": [{
            targetDate: new Date("2025-01-01T00:00:00"),
            title: "🎉 New Year"
        }],
        "6": [{
            targetDate: new Date("2025-06-22T02:42:00Z"),
            title: "☀️ Solstice"
        }],
        "9": [{
            targetDate: new Date("2025-12-21T15:03:00Z"),
            title: "🥶 Solstice",
        }]
    },
};

const THIS_YEAR = (new Date()).getFullYear();
const THIS_MONTH = (new Date()).getMonth() + 1;
const NEXT_YEAR = THIS_YEAR + 1;

export function countdownSuggestions(): CandiDay[] {
    const now = new Date();
    const thisYear = Object.entries(candidates[THIS_YEAR]).reduce<CandiDay[]>((p, c) => {
        const [key, dates] = c;
        const month = parseInt(key);

        // We don't care about months prior to us
        if (month < THIS_MONTH) {
            return p;
        }

        const interestingDates = dates.filter((d) => d.targetDate > now);
        p.push(...interestingDates);

        return p;
    }, []);

    const nextYear = Object.entries(candidates[NEXT_YEAR]).reduce<CandiDay[]>((p, c) => {
        const [key, dates] = c;
        const month = parseInt(key);

        // We don't care about months after us, next year (e.g. 12 month
        // window of interest)
        if (month > THIS_MONTH) {
            return p;
        }

        p.push(...dates);

        return p;
    }, [{
        targetDate: new Date(`${NEXT_YEAR}-01-01T00:00:00`),
        title: "🥳 New Year"
    }, {
        targetDate: new Date("2038-01-19T03:17:07"),
        title: "🖥 2038 Problem"
    }]);

    const dates = thisYear.concat(nextYear).sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
    return dates.slice(0, 4);
}