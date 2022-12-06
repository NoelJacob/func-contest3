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

        const cell_size = 2;
        let recursive = (cells, bits, refs, refs_total) => {
            if (bits < 998976) {
                if (refs_total < 254) {
                    if (refs < 4) {
                    cells += 1;
                    refs_total += 1;
                    bits += cell_size;
                    refs += 1;
                    let res = beginCell().storeUint(0, cell_size).storeRef(recursive(cells, bits, refs, refs_total));
                    return res.endCell();
                    }
                }
            }
            console.log("Cells: " + (cells + 1), "Bits: " + (bits + 1023), "Refs: " + refs_total);
            return beginCell().storeUint(0, 1023).endCell();
        }
        let big_cell = recursive(0, 0, 0, 0);

        let result = await x.invokeGetMethod("decomposite", [stackCell(big_cell), stackSlice(destination_address)])
        let [cells, bits, refs] = result.result[0]
        // expect(cells).toBe(1)
        // expect(bits).toBe(8)
        // expect(refs).toBe(0)
        console.log("Cells:" + cells.toString(), "Bits:" + bits.toString(), "Refs:" + refs.toString())
    })
})
