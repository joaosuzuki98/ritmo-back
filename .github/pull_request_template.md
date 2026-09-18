# 📝 Description

**Example:** This pull request adds user authentication to the system, modifying functions X and Y to support this new functionality and adding a new field W to the database for refresh token persistence. It also includes performance improvements in the authentication functions and hashing time.

# 🔧 Changes

* Added refresh token and access token functionality
* Added middleware to protect routes
* Added sign-in and sign-out endpoints

# 🧪 How to test

1. Make a request to `/customer/123`
2. Verify that the API returns a `401` error
3. Make a request to `/sign-in` with the default user credentials
4. Try accessing `/customer/123` again and verify the data is returned correctly

# 🎯 Checklist

- [x] My code follows the project's standards
- [x] I added/updated tests
- [x] I updated the documentation
- [x] Lints passed
- [x] I did a self-review of the code

# 🔗 Issue

**Example:** Closes #123