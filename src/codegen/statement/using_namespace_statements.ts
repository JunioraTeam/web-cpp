import {SyntaxError} from "../../common/error";
import {ClassDirective, SourceLocation} from "../../common/node";
import {ClassType} from "../../type/class_type";
import {CompileContext} from "../context";
import {Identifier} from "../expression/identifier";
import {Scope} from "../scope";
import {Statement} from "./statement";

export class UsingNamespaceStatement extends ClassDirective {
    public namespace: Identifier;

    constructor(location: SourceLocation, namespace: Identifier) {
        super(location);
        this.namespace = namespace;
    }

    public codegen(ctx: CompileContext): void {
        const scopes = this.getNamespaceScopes(ctx.scopeManager.root, this.namespace.getLookupName(ctx));
        if (scopes.length === 0) {
            throw new SyntaxError(`${this.namespace.getFullName(ctx)} is not a namespace`, this);
        }
        scopes.map((scope) => ctx.scopeManager.currentContext.activeScopes.push(scope));
    }

    public declare(ctx: CompileContext, classType: ClassType): void {
        this.codegen(ctx);
    }

    private getNamespaceScopes(scope: Scope, name: string): Scope[] {
        if (name.slice(0, 2) === "::") {
            name = name.slice(2);
        }
        const tokens = name.split("::").filter((x) => x !== "");
        let scopes = [scope];
        for (const token of tokens) {
            const nextScopes: Scope[] = [];
            scopes.map((item) => {
                item.children
                    .filter((child) => child.shortName === token)
                    .map((child) => nextScopes.push(child));
            });
            scopes = nextScopes;
        }
        return scopes;
    }

}
