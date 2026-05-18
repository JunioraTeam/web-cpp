/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 06/07/2018
 */
import {InternalError} from "../common/error";
import {fromBytesToString} from "../common/utils";

export const DEFAULT_MAX_VM_FILE_BYTES = 100000;

export abstract class VMFile {

    public abstract read(buffer: ArrayBuffer, offset: number, size: number): number;

    public abstract write(buffer: ArrayBuffer): number;

    public abstract flush(): number;

}

export class NoInputFile extends VMFile {
    public read(buffer: ArrayBuffer, offset: number, size: number): number {
        return 0;
    }

    public write(buffer: ArrayBuffer): number {
        throw new InternalError(`NoInputFile is not support write`);
    }

    public flush(): number {
        return 0;
    }
}

export class CommandOutputFile extends VMFile {
    public buffer: string;
    public bytesWritten: number;
    public maxBytes: number;

    constructor(maxBytes: number = DEFAULT_MAX_VM_FILE_BYTES) {
        super();
        this.buffer = "";
        this.bytesWritten = 0;
        this.maxBytes = maxBytes;
    }

    public read(buffer: ArrayBuffer, offset: number, size: number): number {
        throw new InternalError(`CommandOutputFile is not support read`);
    }

    public write(buffer: ArrayBuffer): number {
        this.bytesWritten += buffer.byteLength;
        if (this.bytesWritten > this.maxBytes) {
            throw new RangeError("maximum output bytes exceeded");
        }
        this.buffer += fromBytesToString(new DataView(buffer), 0, buffer.byteLength);
        if (this.buffer.includes("\n")) {
            const lines = this.buffer.split("\n");
            this.buffer = lines[lines.length - 1];
            lines.slice(0, lines.length - 1).map((line) => console.log(line));
        }
        return buffer.byteLength;
    }

    public flush(): number {
        const len = this.buffer.length;
        if ( this.buffer.length === 0 ) {
            return 0;
        }
        console.log(this.buffer);
        this.buffer = "";
        return len;
    }
}

export class StringInputFile extends VMFile {
    public str: string;
    public offset: number;
    public bytesRead: number;
    public maxBytes: number;

    constructor(str: string = "", maxBytes: number = DEFAULT_MAX_VM_FILE_BYTES) {
        super();
        if (str.length > maxBytes) {
            throw new RangeError("maximum input bytes exceeded");
        }
        this.str = str;
        this.offset = 0;
        this.bytesRead = 0;
        this.maxBytes = maxBytes;
    }

    public flush(): number {
        return 0;
    }

    public read(buffer: ArrayBuffer, offset: number, size: number): number {
        let bytes = 0;
        for (let i = 0; i < size; i++) {
            if (this.offset >= this.str.length) { return bytes; }
            new DataView(buffer).setUint8(offset + i, this.str.charCodeAt(this.offset));
            this.offset ++;
            bytes++;
            this.bytesRead++;
            if (this.bytesRead > this.maxBytes) {
                throw new RangeError("maximum input bytes exceeded");
            }
        }
        return bytes;
    }

    public write(buffer: ArrayBuffer): number {
        throw new InternalError(`NoInputFile is not support write`);
    }
}

export class StringOutputFile extends VMFile {
    public output: string[];
    public bytesWritten: number;
    public maxBytes: number;

    constructor(output: string[], maxBytes: number = DEFAULT_MAX_VM_FILE_BYTES) {
        super();
        this.output = output;
        this.bytesWritten = 0;
        this.maxBytes = maxBytes;
    }

    public read(buffer: ArrayBuffer, offset: number, size: number): number {
        throw new InternalError(`CommandOutputFile is not support read`);
    }

    public write(buffer: ArrayBuffer): number {
        this.bytesWritten += buffer.byteLength;
        if (this.bytesWritten > this.maxBytes) {
            throw new RangeError("maximum output bytes exceeded");
        }
        this.output[0] += fromBytesToString(new DataView(buffer), 0, buffer.byteLength);
        return buffer.byteLength;
    }

    public flush(): number {
        return 0;
    }
}

export class CallbackOutputFile extends VMFile {
    public callback: (content: string) => void;
    public bytesWritten: number;
    public maxBytes: number;

    constructor(callback: (content: string) => void, maxBytes: number = DEFAULT_MAX_VM_FILE_BYTES) {
        super();
        this.callback = callback;
        this.bytesWritten = 0;
        this.maxBytes = maxBytes;
    }

    public read(buffer: ArrayBuffer, offset: number, size: number): number {
        throw new InternalError(`CommandOutputFile is not support read`);
    }

    public write(buffer: ArrayBuffer): number {
        this.bytesWritten += buffer.byteLength;
        if (this.bytesWritten > this.maxBytes) {
            throw new RangeError("maximum output bytes exceeded");
        }
        this.callback(fromBytesToString(new DataView(buffer), 0, buffer.byteLength));
        return buffer.byteLength;
    }

    public flush(): number {
        return 0;
    }
}
