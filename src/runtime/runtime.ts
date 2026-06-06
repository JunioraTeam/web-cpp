/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 14/07/2018
 */
import {fromBytesToString} from "../common/utils";
import {FastHeapAllocator, HeapAllocator} from "./allocator";
import {VMFile} from "./vmfile";

export interface ImportObject {
    [module: string]: {
        [name: string]: any,
    };
}

export interface RuntimeOptions {
    heapStart: number;
    importObjects: ImportObject;
    memorySize: number;
    files: VMFile[];
    entry: string;
    maxLoopIterations?: number;
}

export abstract class Runtime {
    public memory: DataView;
    public memoryUint8Array: Uint8Array;
    public memoryBuffer: ArrayBuffer;
    public heapStart: number;
    public heapPointer: number;

    public entry: string;
    public importObjects: ImportObject;
    public files: VMFile[];
    public heapAllocator: HeapAllocator;
    public loopIterations: number;
    public maxLoopIterations: number;
    public ungetChar: number = -1;

    constructor(options: RuntimeOptions) {
        this.memoryBuffer = new ArrayBuffer(options.memorySize);
        this.memoryUint8Array = new Uint8Array(this.memoryBuffer);
        this.memory = new DataView(this.memoryBuffer);
        this.heapStart = options.heapStart;
        this.heapPointer = options.heapStart;
        this.importObjects = options.importObjects;
        this.files = options.files;
        this.heapAllocator = new FastHeapAllocator();
        this.entry = options.entry;
        this.loopIterations = 0;
        this.maxLoopIterations = options.maxLoopIterations === undefined
            ? 10000000 : options.maxLoopIterations;
    }

    public abstract async run(): Promise<void>;

    public abstract get sp(): number;

    public abstract set sp(value: number);

    public abstract printStack(): void;

    public readMemoryString(ptr: number): string {
        return fromBytesToString(this.memory, ptr);
    }
}
