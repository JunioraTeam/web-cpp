/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 16/06/2018
 */

import {Node, Position, SourceLocation} from "./node";

export class FatalError extends Error {
}

export class InternalError extends Error {
}

export class LinkerError extends Error {
}

export class RuntimeError extends Error {
}

export class EmitError extends Error {
}

export class CompilerError extends Error {
    public name: string;
    public node: Node;
    public location: SourceLocation;
    public errorLine: string;
    constructor(message: string, node: Node) {
        super(message);
        this.name = this.constructor.name;
        this.node = node;
        if ( node ) {
            this.location = node.location;
        }  else {
            this.location = new SourceLocation(
                "", "",
                new Position(0, 0, 0),
                new Position(0, 0, 0),
            );
        }
        this.errorLine = "";
    }

    public toString() {
        const fileName = this.location.fileName ? `${this.location.fileName}:` : "";
        const line = this.location.start.line || "?";
        const column = this.location.start.column == null ? "?" : this.getDisplayColumn();
        return `${this.name}: ${this.message} at ${fileName}${line}:${column}`;
    }

    private getDisplayColumn() {
        if (!this.errorLine) {
            return this.location.start.column + 1;
        }
        let column = 1;
        for (let i = 0; i < this.location.start.column && i < this.errorLine.length; i++) {
            column += this.errorLine.charAt(i) === "\t" ? 8 - ((column - 1) % 8) : 1;
        }
        return column;
    }
}

export class TypeError extends CompilerError {
}

export class SyntaxError extends CompilerError {
}

export class LanguageError extends CompilerError {
}

export class PreprocessingError extends CompilerError {
}

export class PreprocessError extends Error {
}

export function assertType<T extends Node>(object: Node | Node[], type: { new(...args: any[]): T }) {
    if (object instanceof Array) {
        if (object.length === 0) {
            throw new FatalError(`the node expect to be ${type.prototype.constructor.name}`
                + `, but actual is a empty array.`);
        } else {
            throw new SyntaxError(`the node expect to be ${type.prototype.constructor.name}`
                + `, but actual is a array of ${object[0].constructor.name}.`, object[0]);
        }
    }
    if (!(object instanceof type)) {
        throw new SyntaxError(`the node expect to be ${type.prototype.constructor.name}`
            + `, but actual is ${object.constructor.name}.`
            , object);
    }
}
