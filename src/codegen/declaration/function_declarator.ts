import {SourceLocation} from "../../common/node";
import {Type} from "../../type";
import {FunctionType} from "../../type/function_type";
import {CompileContext} from "../context";
import {ParameterList} from "../function/parameter_list";
import {Declarator} from "./declarator";

export class FunctionDeclarator extends Declarator {

    public static getFunctionDeclarator(decl: Declarator): FunctionDeclarator | null {
        return decl instanceof FunctionDeclarator ? decl :
            (decl.declarator ? this.getFunctionDeclarator(decl.declarator) : null);
    }
    public parameters: ParameterList;
    public isConst: boolean;
    public isOverride: boolean;

    constructor(location: SourceLocation, declarator: Declarator, parameters: ParameterList,
                isConst: boolean = false, isOverride: boolean = false) {
        super(location, declarator);
        this.parameters = parameters;
        this.isConst = isConst;
        this.isOverride = isOverride;
    }

    public getType(ctx: CompileContext, baseType: Type): Type {
        const result = new FunctionType(
            baseType,
            this.parameters.parameters.map((x) => x.getType(ctx)),
            this.parameters.variableArguments);
        return this.declarator ? this.declarator.getType(ctx, result) : result;
    }

}
