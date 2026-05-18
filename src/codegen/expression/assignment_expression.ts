import * as Long from "long";
import {SyntaxError} from "../../common/error";
import {SourceLocation} from "../../common/node";
import {AddressType} from "../../common/symbol";
import {Type} from "../../type";
import {ClassType} from "../../type/class_type";
import {ArrayType, ConstType, LeftReferenceType, PointerType} from "../../type/compound_type";
import {CharType, FloatingType, IntegerType} from "../../type/primitive_type";
import {WConst, WGetAddress, WMemoryLocation} from "../../wasm";
import {WAddressHolder} from "../address";
import {MemberExpression} from "../class/member_expression";
import {CompileContext} from "../context";
import {doConversion, doReferenceTransform} from "../conversion";
import {CallExpression} from "../function/call_expression";
import {InitializerList, InitializerListExpression} from "../declaration/initializer_list";
import {isFunctionExists} from "../overload";
import {doReferenceBinding} from "../reference";
import {BinaryExpression} from "./binary_expression";
import {doVarInit, Expression, ExpressionResult} from "./expression";
import {Identifier} from "./identifier";
import {IntegerConstant} from "./integer_constant";
import {UnaryExpression} from "./unary_expression";

const __charptr = new PointerType(new CharType());
const __ccharptr = new PointerType(new ConstType(new CharType()));

export class AssignmentExpression extends Expression {
    public operator: string;
    public left: Expression;
    public right: Expression | InitializerList;
    public isInitExpr: boolean;

    constructor(location: SourceLocation, operator: string, left: Expression, right: Expression | InitializerList) {
        super(location);
        this.operator = operator;
        this.left = left;
        this.right = right;
        this.isInitExpr = false;
    }

    public codegen(ctx: CompileContext): ExpressionResult {
        const leftType = this.left.deduceType(ctx);
        const leftClassType = leftType instanceof ClassType
            ? leftType
            : leftType instanceof LeftReferenceType && leftType.elementType instanceof ClassType
                ? leftType.elementType
                : null;
        let right: Expression;
        if (this.right instanceof InitializerList) {
            if (leftClassType === null) {
                throw new SyntaxError(`initializer list assignment requires a class type`, this);
            }
            right = new InitializerListExpression(this.right.location, this.right, leftClassType);
        } else {
            right = this.right;
        }
        const rightType = right.deduceType(ctx);

        // Reference declarations bind the reference itself; do not treat them as class assignment.
        if (this.isInitExpr && leftType instanceof LeftReferenceType) {
            const left = this.left.codegen(ctx);
            const rightResult = right.codegen(ctx);
            doReferenceBinding(ctx, left, rightResult, this);
            return left;
        }

        if (leftClassType !== null) {
            const overloadOperator = this.operator === "=" ? "#=" : "#" + this.operator;
            const fullName = leftClassType.fullName + "::" + overloadOperator;
            if (isFunctionExists(ctx, fullName, [rightType], leftClassType)) {
                return new CallExpression(this.location,
                    new MemberExpression(this.location, this.left, false,
                        Identifier.fromString(this.location, overloadOperator)),
                    [
                        right]).codegen(ctx);
            } else {
                if (this.operator !== "=") {
                    const ope = this.operator.split("=")[0];
                    this.operator = "=";
                    this.right = new BinaryExpression(this.location,
                        ope,
                        this.left,
                        right);
                    return this.codegen(ctx);
                }
                // totally wrong fuck itself
                if (rightType.equals(leftClassType)) {
                    const len = leftClassType.length;
                    return new CallExpression(this.location, Identifier.fromString(this.location, "::memcpy"), [
                        new UnaryExpression(this.location, "&", this.left),
                        new UnaryExpression(this.location, "&", right),
                        new IntegerConstant(this.location, 10, Long.fromInt(len), len.toString(), null),
                    ]).codegen(ctx);
                } else {
                    const ctorName = leftClassType.fullName + "::#" + leftClassType.shortName;
                    const callee = Identifier.fromString(this.location, ctorName);
                    return new CallExpression(this.location, callee, [
                        new UnaryExpression(this.location, "&", this.left),
                        right,
                    ]).codegen(ctx);
                }
            }
        }

        if (this.operator !== "=") {
            const ope = this.operator.split("=")[0];
            this.operator = "=";
            this.right = new BinaryExpression(this.location,
                ope,
                this.left,
                right);
            right = this.right;
        }

        let left = this.left.codegen(ctx);
        const rightResult = right.codegen(ctx);

        if (!left.isLeft && left.type instanceof LeftReferenceType && left.type.elementType instanceof ClassType) {
            left = {
                type: left.type.elementType,
                expr: new WAddressHolder(left.expr, AddressType.RVALUE, this.location),
                isLeft: true,
            };
        } else {
            left = doReferenceTransform(ctx, left, this);
        }

        if (!left.isLeft || !(left.expr instanceof WAddressHolder)) {
            throw new SyntaxError(`could not assign to a right value`, this);
        }

        if (left.type instanceof ArrayType) {
            throw new SyntaxError(`unsupport array assignment`, this);
        }

        // 对于初始化表达式 支持常量初始化到data段
        if (this.isInitExpr && this.left instanceof Identifier &&
            left.expr.type === AddressType.MEMORY_DATA) {
            // int & float
            if (rightResult.expr instanceof WConst &&
                (rightResult.type instanceof IntegerType || rightResult.type instanceof FloatingType)) {
                doVarInit(ctx, left.type, rightResult.type, left.expr.place as number,
                    rightResult.expr.constant, this);
                return left;
            }
            // const char
            if (rightResult.expr instanceof WGetAddress &&
                rightResult.expr.form === WMemoryLocation.DATA &&
                rightResult.type.equals(__ccharptr)) {
                if (!(left.type.equals(__charptr)) && !(left.type.equals(__ccharptr))) {
                    throw new SyntaxError(`unsupport init from ${left.type} to ${rightResult.type}`, this);
                }
                ctx.memory.data.setUint32(left.expr.place as number, rightResult.expr.offset, true);
                return left;
            }
        }

        if (!this.isInitExpr && left.type instanceof ConstType) {
            throw new SyntaxError(`could not assign to const variable`, this);
        }

        ctx.submitStatement(left.expr.createStore(ctx, left.type,
            doConversion(ctx, left.type, rightResult, this).fold()));

        return left;
    }

    public deduceType(ctx: CompileContext): Type {
        return this.left.deduceType(ctx);
    }

}
