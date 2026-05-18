import {InternalError} from "../../common/error";
import {SourceLocation} from "../../common/node";
import {Type} from "../../type";
import {CompileContext} from "../context";
import {Identifier} from "../expression/identifier";
import {Declarator} from "./declarator";

export class StructuredBindingDeclarator extends Declarator {
    public identifiers: Identifier[];

    constructor(location: SourceLocation, identifiers: Identifier[]) {
        super(location, null);
        this.identifiers = identifiers;
    }

    public getType(ctx: CompileContext, baseType: Type): Type {
        return baseType;
    }

    public getName(): Identifier | null {
        throw new InternalError("structured binding has no single name");
    }
}
