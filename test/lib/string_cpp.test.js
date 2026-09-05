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

    it('compares strings with the relational operators', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main(){
    string a = "ab";
    string b = "ac";
    cout << (a == "ab") << (a == b) << (a != b) << (a < b) << (a > b)
         << (a <= "ab") << (a >= "ab") << " " << a.compare(b) << " " << b.compare(a);
}
        `;
        const expectOutput = `1011011 -1 1`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('concatenates with operator+ and operator+=', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main(){
    string a = "ab";
    string b = "cd";
    cout << a + b << " " << a + "cd" << " " << a + 'x' << " ";
    string chained = a + b + "ef";
    cout << chained << " ";
    a += b;
    a += "ef";
    a += '!';
    cout << a;
}
        `;
        const expectOutput = `abcd abcd abx abcdef abcdef!`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('copies strings deeply instead of sharing the buffer', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

// a single character still fits in the buffer of the caller, so a shallow copy would show up
void byValue(string copy) {
    copy += "!";
    cout << copy << " ";
}

int main(){
    string original = "base";
    string copy = original;
    copy += "?";
    byValue(original);
    cout << original << " " << copy;
}
        `;
        const expectOutput = `base! base base?`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports substr, find and rfind', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main(){
    string a = "hello world";
    cout << a.substr(6) << " " << a.substr(0, 5) << " ";
    cout << a.find("o") << a.find("o", 5) << a.find('w') << a.rfind("o") << a.rfind('l') << " ";
    cout << a.find("zzz") << " " << a.find('z');
    string needle = "world";
    cout << " " << a.find(needle);
}
        `;
        const expectOutput = `world hello 47679 -1 -1 6`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports at, front, back, pop_back and resize', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main(){
    string a = "abc";
    cout << a.at(1) << a.front() << a.back() << " ";
    a.pop_back();
    cout << a << a.size() << " ";
    a.resize(4, 'z');
    cout << a << " ";
    string filled(3, 'q');
    cout << filled;
}
        `;
        const expectOutput = `bac ab2 abzz qqq`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('reports an out of range index passed to at', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main(){
    string a = "abc";
    cout << a.at(5);
}
        `;
        let thrown = null;
        try {
            await TestBase.testRun(testCode, {isCpp: true});
        } catch (e) {
            thrown = e;
        }
        TestBase.assert.isNotNull(thrown, 'expected a runtime error');
        TestBase.assert.include(thrown.message, 'string index out of range');
    });

    it('converts numbers to strings with to_string', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main(){
    cout << to_string(0) << " " << to_string(42) << " " << to_string(-7) << " ";
    cout << to_string(1234567890123ll) << " " << to_string(1.5) << " ";
    string joined = to_string(5) + "!";
    cout << joined << " " << to_string(12).size();
}
        `;
        const expectOutput = `0 42 -7 1234567890123 1.500000 5! 2`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('parses numbers out of strings with stoi, stoll and stod', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main(){
    string text = "  -42rest";
    cout << stoi("42") << " " << stoi("+7") << " " << stoi(text) << " ";
    cout << stoll("1234567890123") << " " << stod("1.5") << " " << stod("-0.25");
}
        `;
        const expectOutput = `42 7 -42 1234567890123 1.5 -0.25`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('throws when stoi gets no digits at all', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main(){
    cout << stoi("abc");
}
        `;
        let thrown = null;
        try {
            await TestBase.testRun(testCode, {isCpp: true});
        } catch (e) {
            thrown = e;
        }
        TestBase.assert.isNotNull(thrown, 'expected a runtime error');
        TestBase.assert.include(thrown.message, 'no conversion could be performed');
    });
});
