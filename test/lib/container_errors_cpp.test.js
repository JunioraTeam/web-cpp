const TestBase = require('../integration/testbase');
const {assert} = require('chai');

async function expectRuntimeError(testCode, expectedMessage) {
    let thrown = null;
    try {
        await TestBase.testRun(testCode, {isCpp: true});
    } catch (e) {
        thrown = e;
    }
    assert.isNotNull(thrown, 'expected a runtime error');
    assert.include(thrown.message, expectedMessage);
}

describe('container runtime errors', function () {
    it('throws when reading top of an empty stack', async function() {
        const testCode = `
#include <iostream>
#include <stack>
using namespace std;
int main(){
    stack<int> st;
    st.push(10);
    st.push(5);
    cout << "Top element: " << st.top() << endl;
    st.pop();
    st.pop();
    cout << "Top element after pop: " << st.top() << endl;
    return 0;
}
        `;
        await expectRuntimeError(testCode, 'stack::top on empty stack');
    });

    it('throws on invalid empty adapter operations', async function() {
        await expectRuntimeError(`
#include <queue>
using namespace std;
int main(){ queue<int> q; q.pop(); }
        `, 'queue::pop on empty queue');

        await expectRuntimeError(`
#include <queue>
using namespace std;
int main(){ priority_queue<int> pq; pq.top(); }
        `, 'priority_queue::top on empty priority_queue');
    });

    it('throws on invalid vector and map access', async function() {
        await expectRuntimeError(`
#include <vector>
using namespace std;
int main(){ vector<int> values; values.pop_back(); }
        `, 'vector::pop_back on empty vector');

        await expectRuntimeError(`
#include <map>
using namespace std;
int main(){ map<int, int> values; values.key_at(0); }
        `, 'map::key_at index out of range');
    });
});
