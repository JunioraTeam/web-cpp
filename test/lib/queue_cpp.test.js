const TestBase = require('../integration/testbase');

describe('std::queue and std::stack', function () {
    it('supports queue and stack adapters', async function() {
        const testCode = `
#include <iostream>
#include <queue>
#include <stack>
using namespace std;

int main(){
    queue<int> q;
    q.push(1);
    q.push(2);
    q.push(3);
    cout << q.front() << " " << q.back() << " ";
    q.pop();
    cout << q.front() << " " << q.size() << " ";

    stack<int> s;
    s.push(4);
    s.push(5);
    cout << s.top() << " ";
    s.pop();
    cout << s.top();
}
        `;
        const expectOutput = `1 3 2 2 5 4`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
