const TestBase = require('../integration/testbase');

describe('std::string', function () {
    it('supports basic string operations', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main(){
    string a("hello");
    a += " ";
    a += "world";
    a.push_back('!');
    a[0] = 'H';
    cout << a.c_str() << " " << a.size();
}
        `;
        const expectOutput = `Hello world! 12`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
