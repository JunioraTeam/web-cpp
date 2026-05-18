import {Directive, SourceLocation} from "../../common/node";
import {AccessControl} from "../../type";
import {ClassType} from "../../type/class_type";
import {TypeName} from "../class/type_name";
import {CompileContext} from "../context";
import {Identifier} from "../expression/identifier";
import {MemberExpression} from "../class/member_expression";
import {UsingStatement} from "../statement/using_statement";
import {Expression} from "../expression/expression";
import {InitDeclarator} from "./init_declartor";
import {IdentifierDeclarator} from "./identifier_declarator";
import {SpecifierList} from "./specifier_list";
import {StructuredBindingDeclarator} from "./structured_binding_declarator";

export class Declaration extends Directive {
    public specifiers: SpecifierList;
    public initDeclarators: InitDeclarator[];

    constructor(location: SourceLocation, specifiers: SpecifierList, initDeclarators: InitDeclarator[]) {
        super(location);
        this.specifiers = specifiers;
        this.initDeclarators = initDeclarators;
    }

    public declare(ctx: CompileContext, classType: ClassType): void {
        const type = this.specifiers.getType(ctx);
        const isTypedef = this.specifiers.specifiers.includes("typedef");
        for (const declarator of this.initDeclarators) {
            if (isTypedef) {
                const name = declarator.declarator.getNameRequired().getPlainName(ctx);
                new UsingStatement(this.location, Identifier.fromString(this.location, name),
                    new TypeName(this.location, this.specifiers, declarator.declarator)).codegen(ctx);
            } else {
                declarator.declareInClass(ctx, {
                    type,
                    isLibCall: this.specifiers.specifiers.includes("__libcall"),
                    isExtern: this.specifiers.specifiers.includes("extern"),
                    isStatic: this.specifiers.specifiers.includes("static"),
                    isVirtual: this.specifiers.specifiers.includes("virtual"),
                    accessControl: classType.accessControl,
                }, classType);
            }
        }
    }

    public codegen(ctx: CompileContext): void {
        const isAuto = this.specifiers.specifiers.includes("auto");
        const type = isAuto ? null : this.specifiers.getType(ctx);
        const isTypedef = this.specifiers.specifiers.includes("typedef");
        const isInClass = ctx.scopeManager.currentContext.scope.classType !== null;
        if (isInClass && this.specifiers.specifiers.includes("static")) {
            return;
        }
        for (const declarator of this.initDeclarators) {
            if (isTypedef) {
                const name = declarator.declarator.getNameRequired().getPlainName(ctx);
                new UsingStatement(this.location, Identifier.fromString(this.location, name),
                    new TypeName(this.location, this.specifiers, declarator.declarator)).codegen(ctx);
            } else if (declarator.declarator instanceof StructuredBindingDeclarator) {
                this.codegenStructuredBinding(ctx, declarator);
            } else {
                const declaratorType = isAuto ? declarator.deduceAutoType(ctx) : type!;
                declarator.declare(ctx, {
                    type: declaratorType,
                    isLibCall: this.specifiers.specifiers.includes("__libcall"),
                    isExtern: this.specifiers.specifiers.includes("extern"),
                    isStatic: this.specifiers.specifiers.includes("static"),
                    isVirtual: this.specifiers.specifiers.includes("virtual"),
                    accessControl: isInClass ? AccessControl.Unknown : AccessControl.Public,
                });
            }
        }
    }

    private codegenStructuredBinding(ctx: CompileContext, declarator: InitDeclarator): void {
        if (!this.specifiers.specifiers.includes("auto")) {
            throw new Error("structured binding currently requires auto");
        }
        if (!(declarator.initializer instanceof Expression)) {
            throw new Error("structured binding requires an expression initializer");
        }
        const binding = declarator.declarator as StructuredBindingDeclarator;
        if (binding.identifiers.length !== 2) {
            throw new Error("only pair-like structured bindings are supported");
        }
        const members = ["first", "second"];
        for (let i = 0; i < binding.identifiers.length; i++) {
            const memberExpr = new MemberExpression(this.location, declarator.initializer, false,
                Identifier.fromString(this.location, members[i]));
            const item = new InitDeclarator(this.location,
                new IdentifierDeclarator(this.location, binding.identifiers[i]), memberExpr);
            const declaratorType = item.deduceAutoType(ctx);
            item.declare(ctx, {
                type: declaratorType,
                isLibCall: false,
                isExtern: false,
                isStatic: false,
                accessControl: AccessControl.Public,
            });
        }
    }

    public getTypedefName(): string[] {
        if (this.specifiers.specifiers.includes("typedef")) {
            return this.initDeclarators.map((decl) => decl.declarator.getNameRequired())
                .map((x) => x.getLastID().name);
        } else {
            return [];
        }
    }
}
