// Prisma returns BigInt for BigInt columns, and JSON.stringify (used by
// res.json) throws on BigInt. Our unix-ms timestamps and second durations are
// all well below Number.MAX_SAFE_INTEGER, so convert every BigInt to a Number
// before serializing. Use on any response carrying scheduling data.
export function serialize<T>(value: T): T {
	if (typeof value === "bigint") {
		return Number(value) as unknown as T;
	}
	if (Array.isArray(value)) {
		return value.map((v) => serialize(v)) as unknown as T;
	}
	if (value instanceof Date) {
		return value;
	}
	if (value !== null && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			out[k] = serialize(v);
		}
		return out as T;
	}
	return value;
}
