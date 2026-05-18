import {Directive, SourceLocation} from "../../common/node";
import {CompileContext} from "../context";
import {Identifier} from "../expression/identifier";
import {Scope} from "../scope";

export class NameSpaceBlock extends Directive {
    public namespace: Identifier;
    public statements: Directive[];

    constructor(location: SourceLocation, namespace: Identifier, statements: Directive[]) {
        super(location);
        this.namespace = namespace;
        this.statements = statements;
    }

    public codegen(ctx: CompileContext): void {
        const namespaceName = this.namespace.getPlainName(ctx);
        const parentScope = ctx.scopeManager.currentContext.scope;
        let newScope = parentScope.children
            .filter((scope) => scope.shortName === namespaceName && !scope.isInnerScope)[0];
        if (!newScope) {
            newScope = new Scope(namespaceName, parentScope, ctx.isCpp());
            parentScope.children.push(newScope);
        }
        ctx.scopeManager.contextStack.push(ctx.scopeManager.currentContext);
        const activeScopes = ctx.scopeManager.currentContext.activeScopes
            .filter((scope) => scope.fullName !== newScope.fullName);
        ctx.scopeManager.currentContext = {
            scope: newScope,
            activeScopes: [...activeScopes, newScope],
        };
        this.statements.map((x) => x.codegen(ctx));
        ctx.exitScope(this);
    }

}
