#include <vector>
#include <iostream>

using namespace std;

using ll = long long;

constexpr int A = 100;

void solve() {
    int n;
    cin >> n;
    vector<int> cnt(2 * A + 1);
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        cnt[x + A]++;
    }
    ll pos = 0, neg = 0;
    for (int x = -A; x <= A; x++) {
        if (x > 0) {
            pos += 1LL * x * cnt[x + A];
        } else {
            neg += 1LL * x * cnt[x + A];
        }
    }
    cout << max(pos, -neg) << '\n';
}

signed main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int tt = 1;
    // cin >> tt;
    while (tt--) {
        solve();
    }
}
