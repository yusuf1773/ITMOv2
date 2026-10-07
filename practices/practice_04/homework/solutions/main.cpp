#include <iostream>




using namespace std;



int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;    
    std::cin >> n;
    long long x = 0, y = 0;
    for (int i = 0; i < n; ++i) {
        int curr;
        std::cin >> curr;
        if (curr > 0) {
            x += curr;
        } else {
            y -= curr;
        }
    }
    std::cout << std::max(x, y) << std::endl;
}
