const TestBase = require('../integration/testbase');
const {assert} = require('chai');

describe('iostream', function () {
    it('test cout', async function() {
        const testCode = `
#include <iostream>
int main(){
    std::cout << "hello " << 42 << ' ' << 3.5 << std::endl;
    using namespace std;
    cout << (1 == 1) << ' ' << -12ll << ' ' << 7u;
    return 0;
}
        `;
        const expectOutput = `hello 42 3.5\n1 -12 7`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('test cout with global using namespace and implicit main return', async function() {
        const testCode = `
#include <iostream>
using namespace std;

int main(){
    for (int i = 1; i <= 3; i++){
        cout << "Baroon miad!" << endl;
    }
}
        `;
        const expectOutput = `Baroon miad!\nBaroon miad!\nBaroon miad!`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('prints std::string included through iostream', async function() {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    string str = "Salam!";
    cout << str;
}
        `;
        const expectOutput = `Salam!`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('test indented include and cin', async function() {
        const testCode = `
 #include <iostream>

using namespace std;

int main()
{
    int a, b, i = 1;
    while (i <= 2)
    {
        cin >> a >> b;
        if (a == b)
        {
            cout << "Same" << endl;
        }
        else
        {
            cout << "Diffrent" << endl;
        }
        i++;
    }
}
        `;
        const expectOutput = `Diffrent\nSame`;
        return await TestBase.testFullCode(testCode, expectOutput, {
            isCpp: true,
            input: "1 2 2 2",
        });
    });

    it('reads char with cin extraction', async function() {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    char c;
    cin >> c;
    if (c == 'G')
    {
        cout << "Golrokh" << endl;
    }
    if (c == 'B')
    {
        cout << "Bijhan" << endl;
    }
}
        `;
        const expectOutput = `Golrokh`;
        return await TestBase.testFullCode(testCode, expectOutput, {
            isCpp: true,
            input: "G",
        });
    });

    it('reads bool with cin extraction', async function() {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    bool lale;
    cin >> lale;
    cout << lale;
    return 0;
}
        `;
        const cases = [
            ["0", "0"],
            ["1", "1"],
            ["2", "1"],
            ["-1", "1"],
            ["-2", "1"],
            ["a", "0"],
            ["A", "0"],
        ];
        for (const [input, expectOutput] of cases) {
            await TestBase.testFullCode(testCode, expectOutput, {isCpp: true, input});
        }
    });

    it('reads float and int with cin extraction', async function() {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    int number;
    float x, y;
    cin >> x >> number >> y;
    cout << x << ' ' << number << ' ' << y;
    return 0;
}
        `;
        await TestBase.testFullCode(testCode, "1.5 2 1.5", {isCpp: true, input: "1.5 2 1.5"});
        await TestBase.testFullCode(testCode, "1.5 2 0.5", {isCpp: true, input: "1.5 2.5 1.5"});
    });

    it('reads double with cin extraction', async function() {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    double a, b;
    cin >> a >> b;
    cout << a + b;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, "4", {isCpp: true, input: "1.5 2.5"});
    });

    it('reads std::string with cin extraction', async function() {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    string s;
    cin >> s;
    cout << s;
    return 0;
}
        `;
        await TestBase.testFullCode(testCode, "Nima", {isCpp: true, input: "Nima"});
        await TestBase.testFullCode(testCode, "Nima", {isCpp: true, input: "  \n\t Nima  Heydari\n"});
    });

    it('reads several strings and skips whitespace between them', async function() {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    string first, last;
    int age;
    cin >> first >> age >> last;
    cout << first << '|' << age << '|' << last << '|' << last.size();
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, "Golrokh|27|Bijhan|6", {
            isCpp: true,
            input: "\n  Golrokh\t 27\nBijhan Extra\n",
        });
    });

    it('clears the previous value when reusing a string for cin', async function() {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    string s = "initial value";
    for (int i = 0; i < 3; i++) {
        cin >> s;
        cout << s << ' ' << s.size() << endl;
    }
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, "a 1\nbb 2\nccccccccccccccccc 17", {
            isCpp: true,
            input: "a bb ccccccccccccccccc",
        });
    });

    it('throws when cin reaches EOF before reading a string', async function() {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    string s;
    cin >> s;
    cout << s;
}
        `;
        let thrown = null;
        try {
            await TestBase.testRun(testCode, {isCpp: true, input: "   \n\t  "});
        } catch (e) {
            thrown = e;
        }
        assert.isNotNull(thrown, 'expected a runtime error');
        assert.include(thrown.message, 'EOF when reading from stdin');
    });

    it('reads whole lines with getline', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main()
{
    string first, second;
    getline(cin, first);
    getline(cin, second);
    cout << first << "|" << second << "|" << first.size();
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, "a b c||5", {
            isCpp: true,
            input: "a b c\n\nrest",
        });
    });

    it('reads a line up to a custom delimiter with getline', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main()
{
    string field;
    getline(cin, field, ',');
    cout << field << "|";
    getline(cin, field, ',');
    cout << field;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, "one|two", {
            isCpp: true,
            input: "one,two,three",
        });
    });

    it('throws when getline reaches EOF', async function() {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main()
{
    string line;
    getline(cin, line);
    cout << line;
}
        `;
        let thrown = null;
        try {
            await TestBase.testRun(testCode, {isCpp: true, input: ""});
        } catch (e) {
            thrown = e;
        }
        assert.isNotNull(thrown, 'expected a runtime error');
        assert.include(thrown.message, 'EOF when reading from stdin');
    });

    it('prints const char pointers', async function() {
        const testCode = `
#include <iostream>
using namespace std;

const char *greet() {
    return "hello";
}

int main()
{
    const char *text = "world";
    char buffer[6] = "chars";
    cout << greet() << " " << text << " " << buffer;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, "hello world chars", {isCpp: true});
    });

    it('throws when cin reaches EOF before reading an int', async function() {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    int a;
    cin >> a;
    cout << a;
}
        `;
        let thrown = null;
        try {
            await TestBase.testRun(testCode, {isCpp: true, input: ""});
        } catch (e) {
            thrown = e;
        }
        assert.isNotNull(thrown, 'expected a runtime error');
        assert.include(thrown.message, 'EOF when reading from stdin');
    });
});
