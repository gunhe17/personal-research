# Documenting code

> This use case demonstrates how to use Poolside to generate, improve, and maintain code documentation. This can be especially useful when interacting with legacy codebases and understanding how existing codebases work.

## Generating function documentation

**Prompt:**

`I have this function that calculates compound interest. Ask docstrings to explain what this function does, its parameters, and return value`

```python theme={null}
def calculate_compound_interest(principal, rate, time, compounds_per_year=1):
    amount = principal * (1 + rate/compounds_per_year) ** (compounds_per_year * time)
    return amount - principal
```

**Response:**

```python theme={null}
def calculate_compound_interest(principal, rate, time, compounds_per_year=1):
    """
    Calculate compound interest on an investment or loan.
    
    This function computes the interest earned or charged when interest is applied
    to the initial principal plus any accumulated interest from previous periods.
    
    Args:
        principal (float): The initial amount of money
        rate (float): Annual interest rate (as decimal, for example, 0.05 for 5%)
        time (float): Time period in years
        compounds_per_year (int, optional): Number of times interest compounds per year. 
                                       Defaults to 1 (annual compounding).
                                       Common values: 12 (monthly), 365 (daily)
    
    Returns:
        float: The total compound interest earned/charged
        
    Example:
        >>> calculate_compound_interest(1000, 0.05, 2, 12)
        104.71  # $104.71 interest on $1000 over 2 years at 5% monthly compounding
    """
    amount = principal * (1 + rate/compounds_per_year) ** (compounds_per_year * time)
    return amount - principal
```

## Explaining complex code logic

**Prompt:**

`Explain what this JavaScript function does in plain English`

```js theme={null}
function debounce(func, wait, immediate) {
    var timeout;
    return function executedFunction() {
        var context = this;
        var args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}
```

**Response:**

This is a **debounce function** - a common programming pattern used to limit how often a function gets called.

**What it does:**
The debounce function ensures that `func` is only executed once within a specified time period (`wait` milliseconds), even if it's triggered multiple times.

**How it works:**

1. **Delays execution:** When you call the debounced function, it waits for `wait` milliseconds before actually running your function
2. **Resets the timer:** If the debounced function is called again before the timer expires, it cancels the previous timer and starts a new one
3. **Controls when to execute:**
   * With `immediate = false` (default): Function runs after the waiting period ends
   * With `immediate = true`: Function runs immediately on the first call, then waits before allowing another execution

**Common use cases:**

* **Search boxes:** Only trigger API calls after user stops typing
* **Window resizing:** Run expensive calculations only after resizing stops
* **Scroll events:** Process scroll position only after scrolling pauses
* **Form validation:** Check input only after user finishes typing

**Example:**

```js theme={null}
// This will only record "Searching..." 1 second after user stops typing
const search = debounce(function(query) {
    logger.info("Searching...", query);
}, 1000);
// Rapid calls will be debounced
search("a");
search("ab");
search("abc"); // Only this call will actually execute after 1 second
```

## Creating API documentation

**Prompt:**

`I need API documentation for this Express.js endpoint. Create a comprehensive doc block.`

```js theme={null}
router.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        
        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();
        
        res.status(201).json({ message: 'User created successfully', userId: user._id });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

**Response:**

```js theme={null}
/**
 * @api {post} /api/users Create New User
 * @apiName CreateUser
 * @apiGroup Users
 * @apiPermission authenticated
 * 
 * @apiDescription Creates a new user account in the system. Requires valid authentication token.
 * 
 * @apiHeader {String} Authorization Bearer <token>
 * 
 * @apiBody {String} username Unique username for the new user (required)
 * @apiBody {String} email Valid email address (required)
 * @apiBody {String} password Password string (minimum 8 characters recommended)
 * 
 * @apiSuccess (201) {String} message Confirmation message
 * @apiSuccess (201) {String} userId ID of the newly created user
 * 
 * @apiError (400) BadRequest Missing required fields (username, email, or password)
 * @apiError (401) Unauthorized Missing or invalid authentication token
 * @apiError (409) Conflict User with this email already exists
 * @apiError (500) InternalServerError Database or server error
 * 
 * @apiExample {curl} Example usage:
 *     curl -X POST https://api.example.com/api/users \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
 *       -H "Content-Type: application/json" \
 *       -d '{"username":"john_doe","email":"john@example.com","password":"securePassword123"}'
 * 
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "message": "User created successfully",
 *       "userId": "5f9d3b1c4a8e5c2d1a2b3c4d5e6f"
 *     }
 * 
 * @apiErrorExample {json} Error Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Username, email, and password are required"
 *     }
 */
router.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        
        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();
        
        res.status(201).json({ message: 'User created successfully', userId: user._id });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

## Improving existing documentation

**Prompt:**

`This documentation is too technical. Can you rewrite it to be more accessible to junior developers?`

```js theme={null}
/**
 * Implements a binary search tree data structure with O(log n) average case operations.
 * Supports insertion, deletion, and traversal methods including inorder, preorder,
 * and postorder traversals. Memory management handled via recursive node allocation.
 */
class BinarySearchTree {
    // ... implementation
}
```

**Response:**

```js theme={null}
/**
 * A Binary Search Tree (BST) - Think of it like a family tree where each person
 * (node) knows about their children, and there's a special rule about who goes left/right.
 * 
 * How it works:
 * - Each node can have up to 2 children (left and right)
 * - Left child always has a smaller value than its parent
 * - Right child always has a larger value than its parent
 * - This organization makes searching very fast!
 * 
 * Why use it?
 * - Finding items is much faster than searching through a regular list
 * - Adding and removing items maintains the organized structure
 * - Great for things like autocomplete features or keeping sorted data
 * 
 * Example:
 * If you insert numbers [5, 3, 7, 1, 4], the tree looks like:
 *       5
 *      / \
 *     3   7
 *    / \
 *   1   4
 * 
 * Time complexity:
 * - Looking up items: Very fast (like finding a word in a dictionary)
 * - Adding items: Also very fast
 * - Worst case: Can become slow if items are added in order (becomes like a list)
 */
class BinarySearchTree {
    // ... implementation
}
```

## Generating README documentation

**Prompt:**

`Create a README section explaining how to use this configuration utility.`

```
const config = {
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME || 'myapp'
    },
    server: {
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || '0.0.0.0'
    },
    security: {
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
        saltRounds: parseInt(process.env.SALT_ROUNDS) || 10
    }
};

module.exports = config;
```

**Response:**

```md theme={null}
## Configuration

This application uses environment variables for configuration. You can set these in a `.env` file or directly in your environment.

### Required environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database hostname | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `myapp` |
| `PORT` | Server port | `3000` |
| `HOST` | Server binding address | `0.0.0.0` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key` |
| `SALT_ROUNDS` | bcrypt salt rounds for password hashing | `10` |

### Example .env File


DB_HOST=mydb.example.com
DB_PORT=5432
DB_NAME=production_db
PORT=8080
JWT_SECRET=super-secret-jwt-key-change-in-production
SALT_ROUNDS=12


### Security notes

- **Always change `JWT_SECRET`** in production environments
- Higher `SALT_ROUNDS` values provide better security but slower performance
- Never commit your `.env` file to version control
```
