const TestBase = require('../integration/testbase');

describe('cstring', function () {
    it('initializes char arrays from string literals for strcat and strlen', async function() {
        const testCode = `
#include <cstring>
#include <iostream>

using namespace std;

int main()
{
    char name[20] = "David ";
    char last_name[20] = "Lauren";
    cout << "Before Concatenation" << endl;
    cout << "\\tName string: " << name << endl;
    cout << "\\tString length: " << strlen(name) << endl;
    strcat(name, last_name);
    cout << "After Concatenation" << endl;
    cout << "\\tName string: " << name << endl;
    cout << "\\tString length: " << strlen(name) << endl;
    return 0;
}
        `;
        const expectOutput = `Before Concatenation
\tName string: David 
\tString length: 6
After Concatenation
\tName string: David Lauren
\tString length: 12
`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('deduces unsized char arrays from string literals', async function() {
        const testCode = `
#include <cstring>
#include <iostream>
using namespace std;

int main() {
    char text[] = "abc";
    cout << sizeof(text) << " " << strlen(text) << " " << text;
    return 0;
}
        `;
        const expectOutput = `4 3 abc`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
