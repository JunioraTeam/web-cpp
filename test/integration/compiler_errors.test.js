const {assert} = require('chai');
const {compileFile, CompilerError} = require('../../dist/tools/compiler');

function compileError(source) {
    try {
        compileFile('main.cpp', source, true);
    } catch (e) {
        return e;
    }
    return null;
}

describe('compiler errors', function() {
    it('reports source line and column for missing brace at EOF', function() {
        const source = `#include <iostream>
using namespace std;

int main()
{
	int x;
cin >> x;
if (x== 0|| x>0){
	cout <<x;}
else if(x > 0&&x/2==0){
		int y = x;
		cout <<y;
		}
else{
	cout << 2*x;
	
}`;
        const thrown = compileError(source);

        assert.instanceOf(thrown, CompilerError);
        assert.equal(thrown.toString(), "SyntaxError: Missing '}' at main.cpp:17:2");
        assert.equal(thrown.errorLine, '}');
    });

    it('reports source line and column for a missing expression after an operator', function() {
        const source = `#include <iostream>
using namespace std;

int main()
{
	int x;
cin >> x;
if (x== 0|| x>0){
	cout <<x;}
else if(x > 0&&x/2==0){
		int y = x;
		cout <<y;
		}
else{
	cout << 2*;
	
}}`;
        const thrown = compileError(source);

        assert.instanceOf(thrown, CompilerError);
        assert.equal(thrown.toString(), "SyntaxError: expected primary-expression before ';' token at main.cpp:15:19");
        assert.equal(thrown.errorLine, '\tcout << 2*;');
    });

    it('reports operand types for a missing class operator overload', function() {
        const source = `#include <iostream>
using namespace std;

int main()
{
	int x;
cin >> x;
if (x== 0|| x>0){
	cout <<x;}
else if(x > 0&&x/2==0){
		int y = x;
		cout <<y;
		}
else{
	cout >> 2*2;
	
}}`;
        const thrown = compileError(source);

        assert.instanceOf(thrown, CompilerError);
        assert.equal(thrown.toString(),
            "SyntaxError: no match for 'operator>>' (operand types are 'ostream' and 'int') at main.cpp:15:14");
        assert.equal(thrown.errorLine, '\tcout >> 2*2;');
    });

    it('rejects private member access outside the class', function() {
        const source = `
class A {
private:
    int value;
public:
    int get() {
        return value;
    }
};

int main() {
    A a;
    a.value = 1;
    return 0;
}`;
        const thrown = compileError(source);

        assert.instanceOf(thrown, CompilerError);
        assert.equal(thrown.toString(), "SyntaxError: value is private in A at main.cpp:13:5");
        assert.equal(thrown.errorLine, '    a.value = 1;');
    });

    it('collects warning diagnostics', function() {
        const source = `
void f(long long x) {}
void f(unsigned int x) {}
int main() {
    f(1);
    return 0;
}`;
        const binary = compileFile('main.cpp', source, true);

        assert.isAtLeast(binary.warnings.length, 1);
        assert.include(binary.warnings[0].message, 'ambiguous');
    });

    it('reports keyword identifiers directly', function() {
        const source = `
int main() {
    int class = 1;
    return 0;
}`;
        const thrown = compileError(source);

        assert.instanceOf(thrown, CompilerError);
        assert.equal(thrown.toString(), "SyntaxError: keyword 'class' cannot be used as an identifier at main.cpp:3:9");
        assert.equal(thrown.errorLine, '    int class = 1;');
    });

    it('rejects invalid override declarations', function() {
        const source = `
class A {
public:
    int value() override {
        return 1;
    }
};
int main() {
    return 0;
}`;
        const thrown = compileError(source);

        assert.instanceOf(thrown, CompilerError);
        assert.include(thrown.toString(), "marked override but does not override");
    });
});
