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
