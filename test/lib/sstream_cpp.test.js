const TestBase = require('../integration/testbase');

describe('std::sstream', function () {
    it('builds a string with an ostringstream', async function() {
        const testCode = `
#include <iostream>
#include <sstream>
#include <string>
using namespace std;

int main() {
    ostringstream out;
    string name = "world";
    out << "hello " << name << " " << 42 << " " << 1.5 << " " << 'c' << " " << true;
    cout << out.str() << "|" << out.str().size();
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `hello world 42 1.5 c 1|22`, {isCpp: true});
    });

    it('reads values out of an istringstream', async function() {
        const testCode = `
#include <iostream>
#include <sstream>
#include <string>
using namespace std;

int main() {
    istringstream in("10 20 word 1.5");
    int first, second;
    string text;
    double fraction;
    in >> first >> second >> text >> fraction;
    cout << first + second << " " << text << " " << fraction;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `30 word 1.5`, {isCpp: true});
    });

    it('stops extracting once the input runs out', async function() {
        const testCode = `
#include <iostream>
#include <sstream>
#include <string>
using namespace std;

int main() {
    istringstream in("1 2 3");
    int value;
    int total = 0;
    while (in >> value) {
        total += value;
    }
    cout << total << " " << in.fail() << " ";
    istringstream words("a bb ccc");
    string word;
    while (words >> word) {
        cout << word << "|";
    }
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `6 1 a|bb|ccc|`, {isCpp: true});
    });

    it('writes and reads the same stringstream', async function() {
        const testCode = `
#include <iostream>
#include <sstream>
#include <string>
using namespace std;

int main() {
    stringstream stream;
    stream << 7 << " " << 8;
    int left, right;
    stream >> left >> right;
    cout << stream.str() << " " << left * right;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `7 8 56`, {isCpp: true});
    });

    it('replaces the buffer with str', async function() {
        const testCode = `
#include <iostream>
#include <sstream>
#include <string>
using namespace std;

int main() {
    istringstream in;
    in.str("5 6");
    int left, right;
    in >> left >> right;
    string source = "9 10";
    istringstream other(source);
    int third, fourth;
    other >> third >> fourth;
    cout << left << right << " " << third << fourth;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `56 910`, {isCpp: true});
    });
});
