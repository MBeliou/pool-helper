// Tiny typed accessor over the process env (populated by `--env-file=.env`).
// Fails loudly with a helpful message rather than sending empty auth headers.

export function req(name: string): string {
	const v = Deno.env.get(name);
	if (!v || v.trim() === "") {
		console.error(
			`\n✗ Missing env var ${name}.\n  Copy tools/.env.example → tools/.env and fill it in.\n`,
		);
		Deno.exit(1);
	}
	return v.trim();
}

export function opt(name: string): string | undefined {
	const v = Deno.env.get(name);
	return v && v.trim() !== "" ? v.trim() : undefined;
}
