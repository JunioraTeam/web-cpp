const TestBase = require('../integration/testbase');
const {assert} = require('chai');

async function expectRuntimeError(testCode, options, expectedMessage) {
    let thrown = null;
    try {
        await TestBase.testRun(testCode, options);
    } catch (e) {
        thrown = e;
    }
    assert.isNotNull(thrown, 'expected a runtime error');
    assert.include(thrown.message, expectedMessage);
}

describe('runtime limits', function () {
    it('stops execution after the loop iteration limit', async function() {
        await expectRuntimeError(`
int main(){
    while (1) {
    }
    return 0;
}
        `, {isCpp: true, maxLoopIterations: 5}, 'maximum loop iterations exceeded');
    });

    it('stops execution after the output byte limit', async function() {
        await expectRuntimeError(`
#include <iostream>
using namespace std;
int main(){
    cout << "123456";
    return 0;
}
        `, {isCpp: true, maxOutputBytes: 5}, 'maximum output bytes exceeded');
    });

    it('stops infinite print loops at the output byte limit', async function() {
        await expectRuntimeError(`
#include <iostream>
using namespace std;
int main(){
    for (int i = 1; i >= 1; i++) {
        cout << "Ma bishtar!" << endl;
    }
}
        `, {
            isCpp: true,
            maxOutputBytes: 100,
            maxLoopIterations: 100000,
        }, 'maximum output bytes exceeded');
    });

    it('rejects input above the input byte limit', async function() {
        await expectRuntimeError(`
int main(){
    return 0;
}
        `, {isCpp: true, input: '123456', maxInputBytes: 5}, 'maximum input bytes exceeded');
    });
});
