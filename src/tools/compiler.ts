import {SourceMapConsumer} from "source-map";
import {codegen} from "../codegen";
import {CompileContext} from "../codegen/context";
import {CompilerError, PreprocessError} from "../common/error";
import {BinaryObject} from "../common/object";
import {Impls, JsAPIMap} from "../library";
import {link} from "../linker";
import {CParser} from "../parser";
import {preprocess} from "../preprocessor";
import {CallbackOutputFile, StringInputFile} from "../runtime/vmfile";

/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 04/08/2018
 */

function originalPositionFor(sm: SourceMapConsumer, code: string, position: any): any {
    const lineTexts = code.split("\n");
    const line = Math.min(Math.max(position.line || 1, 1), lineTexts.length);
    const lineText = lineTexts[line - 1] || "";
    const column = Math.min(Math.max(position.column || 0, 0), lineText.length);
    const exact = sm.originalPositionFor({line, column});
    if (exact.line !== null && exact.column !== null) {
        return exact;
    }

    const greatestLowerBound = (SourceMapConsumer as any).GREATEST_LOWER_BOUND;
    for (let candidateLine = line; candidateLine >= 1; candidateLine--) {
        const candidateLineText = lineTexts[candidateLine - 1] || "";
        const candidateColumn = candidateLine === line ? column : candidateLineText.length;
        const candidate = sm.originalPositionFor({
            line: candidateLine,
            column: candidateColumn,
            bias: greatestLowerBound,
        } as any);
        if (candidate.line !== null && candidate.column !== null) {
            return candidate;
        }
    }

    return {
        column,
        line,
        source: null,
    };
}

function sourceEndPosition(source: string) {
    const lines = source.split("\n");
    return {
        column: lines[lines.length - 1].length,
        line: lines.length,
        source: null,
    };
}

function remapCompilerError(e: CompilerError, map: any, code: string, source: string) {
    const sm = new SourceMapConsumer(map.toString());
    const newStart = e.location.start.offset >= code.length ?
        sourceEndPosition(source) : originalPositionFor(sm, code, e.location.start);
    const sourceLine = newStart.source ? newStart.line + 1 : newStart.line;
    const sourceLines = source.split("\n");
    const codeLine = code.split("\n")[e.location.start.line - 1] || "";
    const sourceLineText = sourceLine ? sourceLines[sourceLine - 1] || "" : "";
    const sourceColumn = codeLine === sourceLineText ? e.location.start.column : newStart.column;
    e.errorLine = sourceLineText;
    e.location.fileName = newStart.source || e.location.fileName;
    e.location.start.line = sourceLine || e.location.start.line;
    e.location.start.column = sourceColumn == null ? e.location.start.column : sourceColumn;
}

export function getDebugSymbols(name: string, source: string, options: any = {}) {
    options.fileName = name;
    const {code, map} = preprocess(name, source);
    try {
        const translationUnit = CParser.parse(code, options);
        const ctx = new CompileContext(name, options, source, map);
        codegen(translationUnit, ctx);
        const binary = link("main.cpp", [...precompiledObjects, ctx.toCompiledObject()], options);
        return {
            pre: code,
            asm: binary.dumpInfo,
        };
    } catch (e) {
        if (e instanceof CompilerError) {
            remapCompilerError(e, map, code, source);
        }
        throw e;
    }
}

function compile(name: string, source: string, options: any = {}) {
    options.fileName = name;
    const {code, map} = preprocess(name, source);
    try {
        const translationUnit = CParser.parse(code, options);
        const ctx = new CompileContext(name, options, source, map);
        codegen(translationUnit, ctx);
        return ctx.toCompiledObject();
    } catch (e) {
        if (e instanceof CompilerError) {
            remapCompilerError(e, map, code, source);
        }
        throw e;
    }
}
const precompiledObjects = Array.from(Impls.keys()).map((x) => compile(x, Impls.get(x)!, {isCpp: true}));

// const LibraryObjects = precompileLibrarys();

export function compileFile(sourceFileName: string, source: string, isCpp: boolean = true): BinaryObject {
    const object = compile(sourceFileName, source, {isCpp});
    const binary = link("main.cpp", [...precompiledObjects, object], {});
    return binary;
}

export const importObj: any = {system: {}};
for (const key of Object.keys(JsAPIMap)) {
    importObj["system"]["::" + key] = JsAPIMap[key];
}

export {CompilerError} from "../common/error";
export {NativeRuntime} from "../runtime/native_runtime";
export {JSRuntime} from "../runtime/js_runtime";
export {VMFile, StringOutputFile, StringInputFile, CallbackOutputFile, NoInputFile} from "../runtime/vmfile";
