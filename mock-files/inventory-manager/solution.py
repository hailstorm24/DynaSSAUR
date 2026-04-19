def add_item(inventory, name, quantity, price):
    name = name.lower()
    if name in inventory:
        inventory[name]["quantity"] += quantity
        inventory[name]["price"] = price
    else:
        inventory[name] = {"quantity": quantity, "price": price}
    return inventory


def remove_item(inventory, name):
    name = name.lower()
    if name not in inventory:
        raise KeyError(f"Item '{name}' not found in inventory")
    del inventory[name]
    return inventory


def get_total_value(inventory):
    total = sum(item["quantity"] * item["price"] for item in inventory.values())
    return round(total, 2)


def find_item(inventory, name):
    return inventory.get(name.lower())
