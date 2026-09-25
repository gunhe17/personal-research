# Refactoring code

> This use case demonstrates how to use Poolside to refactor code by understanding existing implementations and suggesting improvements while maintaining functionality.

## Best practices for refactoring with Poolside

1. **Start with clear objectives:** Define specific goals, such as `improve readability`, `reduce complexity` or `modernize syntax`. Focus on one aspect at a time instead of trying to fix everything simultaneously.
2. **Preserve functionality:** Write unit tests before refactoring so that you can verify that the refactored code maintains its original behavior.
3. **Break down large tasks:** For complex refactoring, work in small, incremental steps. Address one method or class at a time.

## Simplifying complex methods

**Prompt:**

`I have this complex method that's doing too many things. Break it down into smaller, more focused methods.`

```js theme={null}
function processUserData(users) {
  const validUsers = [];
  const invalidUsers = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (user.age >= 18 && user.email && user.email.includes('@')) {
      user.fullName = user.firstName + ' ' + user.lastName;
      user.createdAt = new Date();
      user.isActive = true;
      validUsers.push(user);
    } else {
      invalidUsers.push(user);
    }
  }
  
  return { validUsers, invalidUsers };
}
```

**Response:**

```js theme={null}
function processUserData(users) {
  const validUsers = [];
  const invalidUsers = [];
  
  for (const user of users) {
    if (isValidUser(user)) {
      const processedUser = processValidUser(user);
      validUsers.push(processedUser);
    } else {
      invalidUsers.push(user);
    }
  }
  
  return { validUsers, invalidUsers };
}
function isValidUser(user) {
  return user.age >= 18 && 
         user.email && 
         user.email.includes('@');
}
function processValidUser(user) {
  return {
    ...user,
    fullName: `${user.firstName} ${user.lastName}`,
    createdAt: new Date(),
    isActive: true
  };
}
```

## Converting callbacks to promises

`This code is legacy code using callbacks. Modernize it to use async/await`

**Prompt:**

```js theme={null}
function fetchUserData(userId, callback) {
  db.getUser(userId, function(err, user) {
    if (err) return callback(err);
    
    api.getProfile(user.profileId, function(err, profile) {
      if (err) return callback(err);
      
      cache.set(`user:${userId}`, { user, profile }, function(err) {
        if (err) return callback(err);
        callback(null, { user, profile });
      });
    });
  });
}
```

**Response:**

```js theme={null}
async function fetchUserData(userId) {
  try {
    const user = await db.getUserAsync(userId);
    const profile = await api.getProfileAsync(user.profileId);
    await cache.setAsync(`user:${userId}`, { user, profile });
    return { user, profile };
  } catch (error) {
    throw new Error(`Failed to fetch user data: ${error.message}`);
  }
}
// Helper functions to wrap callback-based APIs
function promisify(fn) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  };
}
// Usage
db.getUserAsync = promisify(db.getUser);
api.getProfileAsync = promisify(api.getProfile);
cache.setAsync = promisify(cache.set);
```

## Improving code readability

**Prompt:**

`This code works but is hard to read. Make it more expressive and maintainable`

```js theme={null}
function calc(d, p, t) {
  let r = 0;
  if (d > 0 && p > 0) {
    r = d * p;
    if (t === 'vip') {
      r = r * 0.9;
    } else if (t === 'premium') {
      r = r * 0.95;
    }
  }
  return r;
}
```

**Response:**

```js theme={null}
function calculateDiscountedPrice(discountRate, productPrice, customerType) {
  if (!isValidInput(discountRate, productPrice)) {
    return 0;
  }
  
  const basePrice = discountRate * productPrice;
  return applyCustomerDiscount(basePrice, customerType);
}
function isValidInput(discountRate, productPrice) {
  return discountRate > 0 && productPrice > 0;
}
function applyCustomerDiscount(price, customerType) {
  const discounts = {
    'vip': 0.9,
    'premium': 0.95,
    'standard': 1.0
  };
  
  const discountMultiplier = discounts[customerType] || discounts['standard'];
  return price * discountMultiplier;
}
```

## Generate design patterns

**Prompt:**

`Generate design patterns suggestions could improve this tightly coupled code.`

```java theme={null}
class OrderProcessor {
    public void processOrder(Order order) {
        // Direct instantiation creates tight coupling
        PaymentProcessor payment = new CreditCardProcessor();
        InventoryManager inventory = new DatabaseInventory();
        NotificationService notification = new EmailNotifier();
        
        payment.process(order.getAmount());
        inventory.reduceStock(order.getItems());
        notification.sendConfirmation(order.getCustomerEmail());
    }
} 
```

**Response:**

Looking at this code, I can see several design pattern opportunities to address the tight coupling issues. Let me break down the requirements and suggest improvements:

**Requirements Analysis:**

1. **Tight coupling problem:** Direct instantiation of concrete classes
2. **Need for loose coupling:** Dependencies should be injectable
3. **Maintainability:** Code should be easier to test and modify
4. **Flexibility:** Should support different implementations

**Design pattern suggestions:**

**1. Dependency injection (primary solution)**

Replace direct instantiation with constructor/setter injection:

```java theme={null}
class OrderProcessor {
    private final PaymentProcessor paymentProcessor;
    private final InventoryManager inventoryManager;
    private final NotificationService notificationService;
    
    public OrderProcessor(PaymentProcessor paymentProcessor, 
                         InventoryManager inventoryManager,
                         NotificationService notificationService) {
        this.paymentProcessor = paymentProcessor;
        this.inventoryManager = inventoryManager;
        this.notificationService = notificationService;
    }
    
    public void processOrder(Order order) {
        paymentProcessor.process(order.getAmount());
        inventoryManager.reduceStock(order.getItems());
        notificationService.sendConfirmation(order.getCustomerEmail());
    }
}
```

**2. Strategy pattern (for payment processing)**

Allow different payment methods:

```java theme={null}
interface PaymentProcessor {
    void process(double amount);
}
class CreditCardProcessor implements PaymentProcessor {
    public void process(double amount) { /* implementation */ }
}
class PayPalProcessor implements PaymentProcessor {
    public void process(double amount) { /* implementation */ }
}
```

**3. Factory pattern (alternative to DI)**

Create a factory for dependency creation:

```java theme={null}
class ServiceFactory {
    public static PaymentProcessor createPaymentProcessor() {
        return new CreditCardProcessor();
    }
    
    public static InventoryManager createInventoryManager() {
        return new DatabaseInventory();
    }
    
    public static NotificationService createNotificationService() {
        return new EmailNotifier();
    }
}
```

**4. Service locator pattern (less preferred but viable)**

Centralize service access:

```java theme={null}
class ServiceLocator {
    private static Map<Class<?>, Object> services = new HashMap<>();
    
    public static <T> void register(Class<T> type, T instance) {
        services.put(type, instance);
    }
    
    public static <T> T getService(Class<T> type) {
        return (T) services.get(type);
    }
}
```

**Recommended approach:**

Use **Dependency injection** combined with Strategy Pattern for maximum flexibility and testability. This approach:

* Eliminates tight coupling
* Makes unit testing easier (mock dependencies)
* Allows runtime configuration of implementations
* Follows SOLID principles (Open/Closed, Dependency Inversion)
