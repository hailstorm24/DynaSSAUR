# Inventory Manager

## Overview

You will build a simple inventory management system using a Python dictionary. The inventory maps item names to their details (quantity and price).

## Data Representation

Each item in the inventory is stored as:
```python
inventory = {
    "apple": {"quantity": 10, "price": 0.99},
    "banana": {"quantity": 5, "price": 0.59},
}
```

## Functions to Implement

### `add_item(inventory, name, quantity, price)`
Add a new item to the inventory. If the item already exists, increase its quantity by the given amount (price should update to the new price).

- `inventory` (dict): the inventory dictionary
- `name` (str): item name (case-insensitive, store in lowercase)
- `quantity` (int): number of units to add
- `price` (float): price per unit

Returns the updated inventory.

### `remove_item(inventory, name)`
Remove an item from the inventory entirely.

- Raises `KeyError` if the item does not exist.

Returns the updated inventory.

### `get_total_value(inventory)`
Calculate the total value of all items in the inventory.

Total value = sum of (quantity × price) for each item.

Returns a float rounded to 2 decimal places.

### `find_item(inventory, name)`
Look up an item by name (case-insensitive).

- Returns the item dict `{"quantity": ..., "price": ...}` if found.
- Returns `None` if not found.

## Example Usage

```python
inv = {}
add_item(inv, "Apple", 10, 0.99)
add_item(inv, "Banana", 5, 0.59)
add_item(inv, "Apple", 5, 0.99)   # increases Apple quantity to 15

print(get_total_value(inv))  # 15*0.99 + 5*0.59 = 14.85 + 2.95 = 17.80
print(find_item(inv, "APPLE"))  # {"quantity": 15, "price": 0.99}

remove_item(inv, "Banana")
print(find_item(inv, "banana"))  # None
```
