export type CommandArgs = Record<string, string | boolean>;
export type CommandExec = (
	flags: Map<string, string | boolean>,
	...args: string[]
) => void | Promise<void>;
export enum CommandParamType {
	Command,
	Flag,
	Parameter,
}

function stripDashes(s: string) {
	return s.replace(/^-+/, '');
}

type flagPrefix = `-${string}`;
export type CommandParam =
	| {
			type: Exclude<CommandParamType, CommandParamType.Command>;
			aliases?: flagPrefix[];
	  }
	| { type: CommandParamType.Command; val: Command; aliases?: string[] };
export class Command {
	private params: Map<string, CommandParam> = new Map();
	private exec: CommandExec = () => {};
	description: string = '';
	execute(func: CommandExec) {
		this.exec = func;
		return this;
	}
	flag(name: flagPrefix, aliases: flagPrefix[] = []) {
		if (!name.startsWith('-')) {
			console.error(
				`Attempted to make flag: %c${name}%c, but it doesn't start with %c-%c!`,
				'color:blue',
				'color:white',
				'color:red',
				'color:white'
			);
			return this;
		}
		this.params.set(name, {
			type: CommandParamType.Flag,
			aliases,
		});
		return this;
	}

	option(name: flagPrefix, aliases: flagPrefix[] = []) {
		if (!name.startsWith('-')) {
			console.error(
				`Attempted to make flag: %c${name}%c, but it doesn't start with %c-%c!`,
				'color:blue',
				'color:white',
				'color:red',
				'color:white'
			);
			return this;
		}
		this.params.set(name, {
			type: CommandParamType.Parameter,
			aliases,
		});
		return this;
	}
	subcommand(name: string, cmd: Command, aliases: string[] = []) {
		this.params.set(name, {
			type: CommandParamType.Command,
			val: cmd,
			aliases,
		});
		return this;
	}
	private resolveArg(arg: string): string | undefined {
		for (const [name, param] of this.params) {
			if (name === arg) return name;
			if (param.aliases?.includes(arg as flagPrefix)) return name;
		}
		return undefined;
	}

	async run(args: string[]): Promise<void> {
		args = [...args];

		const flags: Map<string, boolean | string> = new Map();

		const positionals: string[] = [];

		for (const [name, val] of this.params) {
			if (val.type == CommandParamType.Flag) {
				flags.set(stripDashes(name), false);
			} else if (val.type == CommandParamType.Parameter) {
				flags.set(stripDashes(name), '');
			}
		}
		if (args.length > 0) {
			const first = this.resolveArg(args[0]);
			if (first) {
				const param = this.params.get(first);
				if (param?.type === CommandParamType.Command) {
					args.shift(); // consume subcommand token
					return param.val.run(args); // delegate
				}
			}
		}

		while (args.length > 0) {
			const arg = args.shift()!;
			// console.log(arg);
			if (arg === '--') {
				positionals.push(...args);
				break;
			}
			const normalized = this.resolveArg(arg);
			if (!normalized) {
				positionals.push(arg);
				continue;
			}

			const param = this.params.get(normalized);
			if (param == undefined) continue;
			// console.log(normalizedArg);
			if (param.type === CommandParamType.Command) {
				console.error(
					`Subcommand "${normalized}" must appear before flags`
				);
				return;
			}
			if (param.type == CommandParamType.Flag) {
				flags.set(stripDashes(normalized), true);
			}
			if (param.type == CommandParamType.Parameter) {
				const nextArg = args.shift();
				if (!nextArg) {
					console.error(
						'argument not supplied for parameter:',
						normalized
					);
					continue;
				}
				flags.set(stripDashes(normalized), nextArg);
			}
		}
		const ret = this.exec(flags, ...positionals);
		if (ret instanceof Promise) {
			return await ret;
		}
		return ret;
	}
}
