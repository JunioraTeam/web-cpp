const TestBase = require('../integration/testbase');

describe('std::map', function () {
    it('supports ordered key lookup and operator access', async function() {
        const testCode = `
#include <iostream>
#include <map>
using namespace std;

int main(){
    map<int, int> values;
    values[3] = 30;
    values[1] = 10;
    values.insert(2, 20);
    cout << values.size() << " " << values[1] << " " << values[2] << " " << values[3] << " ";
    cout << values.key_at(0) << values.key_at(1) << values.key_at(2) << " ";
    cout << values.find(2) << " " << values.find(9);
}
        `;
        const expectOutput = `3 10 20 30 123 1 -1`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
