// Utility functions for problem panel components

export const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "number" || typeof value === "boolean")
        return String(value);
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (
            (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
            try {
                return JSON.stringify(JSON.parse(trimmed));
            } catch {
                return value;
            }
        }
        return value;
    }
    if (typeof value === "object") {
        try {
            return JSON.stringify(value as Record<string, unknown>);
        } catch {
            return String(value);
        }
    }
    return String(value);
};

export const formatRelativeTime = (isoDate: string): string => {
    const now = new Date();
    const then = new Date(isoDate);
    const diffMs = now.getTime() - then.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
    return then.toLocaleDateString();
};

export const formatSubmissionTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
};

export const getStatusColor = (status: string): string => {
    switch (status) {
        case "accepted":
            return "text-green-600";
        case "wrong_answer":
            return "text-red-600";
        case "time_limit_exceeded":
            return "text-orange-600";
        default:
            return "text-muted-foreground";
    }
};
