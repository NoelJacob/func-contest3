import {compileFunc} from "@ton-community/func-js";
import {Cell, Address, beginCell} from 'ton';
import {readFileSync} from "fs";
import {SmartContract, stackCell, stackSlice, TvmRunnerAsynchronous} from "ton-contract-executor";
import {expect, describe, test, afterAll, beforeAll} from '@jest/globals';
import BN from "bn.js"

const tvm = async (file) => {
    const result = await compileFunc({
        sources: (path) => readFileSync(path).toString(), entryPoints: [`${file}.fc`],
    })
    if (result.status === 'error') throw new Error("Compiler: " + result.message)
    const boc = Cell.fromBoc(Buffer.from(result.codeBoc, "base64"))[0]
    return SmartContract.fromCell(boc, new Cell(), {getMethodsMutate: true, debug: false});
}

afterAll(async () => {
    await TvmRunnerAsynchronous.getShared().cleanup()
})

let x;

describe('1', () => {
    beforeAll(async () => {
        x = await tvm('1_large_cell_builder');
    });
    test('decomposite', async () => {
        let destination_address = beginCell().storeAddress(Address.parse("EQBXhvPD1BYJcL62_gtxqbOHKRl_zK1iMyWrep7xyLGVeNGF")).endCell()
        // let last_cell = beginCell().storeUint(0, 1023).endCell();
        // let big_cell = beginCell().storeUint(0, 1023).storeRef(last_cell).endCell();
        // for(let i = 1; i < 254; ++i) {
        //     big_cell = beginCell().storeUint(0, 1023).storeRef(big_cell).endCell();
        // }

        let rand = (y) => {
            let r = Math.random();
            return new Array(Math.round(r * y)).fill(0).map(() => (r >= .5) ? 1 : 0)
        }

        let recursive = (c, b, d) => {
            let buf = rand(10);
            let bui = beginCell().storeBitArray(buf)
            if (b < 10000 && c < 40) {
                if (d < 3) {
                    c += 1;
                    b += buf.length;
                    d += 1;
                    for (let r = 0; b < 10000 && c < 40 && r < 4; ++r) {
                        c += 1;
                        b += buf.length;
                        bui = bui.storeRef(recursive(c, b, d))
                    }
                }
            }
            console.log("Cells: " + (c + 1), "Bits: " + (b + buf.length), "Depth: " + d);
            return bui.endCell();
        }
        let big_cell = recursive(0, 0, 0);
        console.log(big_cell.refs);

        let result = await x.invokeGetMethod("decomposite", [stackCell(big_cell), stackSlice(destination_address)])
        let [cells, bits, depth] = result.result[0]
        // expect(cells).toBe(c)
        // expect(bits).toBe(b)
        // expect(depth).toBe(d)
        console.log("Cells:" + cells.toString(), "Bits:" + bits.toString(), "Depth:" + depth.toString())
    })
})
