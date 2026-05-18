const TestBase = require('../integration/testbase');

describe('std::priority_queue', function () {
    it('supports max-heap priority queue', async function() {
        const testCode = `#include <iostream>
#include <queue>
using namespace std;
int main(){
    priority_queue<int> pq;
    pq.push(30);
    pq.push(10);
    pq.push(20);
    pq.push(40);
    cout << "Elements removed from priority queue in order:\\n";
    while (!pq.empty()){
        cout << pq.top() << " ";
        pq.pop();
    }
    return 0;
}`;
        const expectOutput = `Elements removed from priority queue in order:\n40 30 20 10`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
