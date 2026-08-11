const TestBase = require('./testbase');

describe('unicode string literals', function () {
    it('prints a non-ascii string literal with cout', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    cout << "سلام" << endl;
}
        `;
        return await TestBase.testFullCode(testCode, `سلام`, {isCpp: true});
    });

    it('prints mixed ascii and non-ascii text', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    cout << "Salam سلام 123 ü € 😀" << endl;
}
        `;
        return await TestBase.testFullCode(testCode, `Salam سلام 123 ü € 😀`, {isCpp: true});
    });

    it('prints a non-ascii string literal with printf', async function () {
        const testCode = `
#include <stdio.h>

int main()
{
    printf("%s|%s\\n", "سلام", "دنیا");
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `سلام|دنیا`, {isCpp: true});
    });

    it('stores non-ascii string literals as utf-8 bytes', async function () {
        // "سلام" is 4 code points, 8 utf-8 bytes.
        const testCode = `
#include <iostream>
#include <cstring>
using namespace std;

int main()
{
    char buffer[] = "سلام";
    cout << strlen(buffer) << endl;
    cout << buffer << endl;
}
        `;
        return await TestBase.testFullCode(testCode, `8\nسلام`, {isCpp: true});
    });

    it('reassembles multi-byte characters written one byte at a time', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    char *text = "سلام";
    for (int i = 0; text[i] != 0; i++) {
        cout << text[i];
    }
    cout << endl;
}
        `;
        return await TestBase.testFullCode(testCode, `سلام`, {isCpp: true});
    });

    it('holds non-ascii text in std::string', async function () {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main()
{
    string greeting = "سلام";
    cout << greeting << endl;
    cout << greeting.length() << endl;
}
        `;
        return await TestBase.testFullCode(testCode, `سلام\n8`, {isCpp: true});
    });

    it('reads non-ascii text from stdin as utf-8', async function () {
        const testCode = `
#include <stdio.h>

int main()
{
    char buffer[64];
    scanf("%s", buffer);
    printf("[%s]\\n", buffer);
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `[درود]`, {isCpp: true, input: 'درود'});
    });
});
