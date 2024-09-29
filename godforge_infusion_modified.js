//------------------------------------------------------------------------------------------------------------------------------------------------
// PA2 Extras - Godforge Infusion
//------------------------------------------------------------------------------------------------------------------------------------------------
// Author: RicTheCoder
//
// A simple mechanic to allow infusing enchantments into non-enchantable items. Gem Armor, Meka-Suit, etc. should be able to have some enchants
// that are more utilitarian.
//
// Uses Ars Noveau and Apotheosis to make a ritual that is interesting to do while still allowing for a balanced mechanic.
//------------------------------------------------------------------------------------------------------------------------------------------------

// The Catalyst (one of the ingredients)
const catalyst = "apotheosis:mythic_material";

// The Infuser (the other ingredient needed)
const infuser = "apotheosis:infused_breath";

// The driving item (doesn't get consumed)
const driver = "pa2_extras:inf_archiveau";

// The amount of source required
// - The ritual always uses at least two jars
// - The amount value is multiplied by enchant
// - And then added onto the base value (which is the base cost)
// - Extra jars can be added up to a total of 5 for 50k source cap
//
// If the cap is reached the infusion won't work
const sourceBase = 5000;
const sourceAmount = 1500;

// The amount of levels per enchant
const levelCost = 15;

// Items that can be infused
// - The key is the id, the value is the type
const infuseable = {
	// Industrial Foregoing
	"industrialforegoing:infinity_hammer": "sword",
	// Mekanism
	"mekaweapons:mekatana": "sword",
	"mekaweapons:mekabow": "bow",
	"mekanism:electric_bow": "bow",
	
	"mekanism:mekasuit_helmet": "helmet",
	"mekanism:mekasuit_bodyarmor": "chestplate",
	"mekanism:mekasuit_pants": "leggings",
	"mekanism:mekasuit_boots": "boots",
	
	"mekanism:free_runners_armored": "boots",
	"mekanism:jetpack_armored": "chestplate",
	"mekanism:hdpe_elytra": "elytra",
	
	"mekanism:atomic_disassembler": "tool",
	"mekanism:meka_tool": "tool",
	
	// ProjectE
	"projecte:gem_helmet": "helmet",
	"projecte:gem_chestplate": "chestplate",
	"projecte:gem_leggings": "leggings",
	"projecte:gem_boots": "boots",
	
	"projecte:rm_helmet": "helmet",
	"projecte:rm_chestplate": "chestplate",
	"projecte:rm_leggings": "leggings",
	"projecte:rm_boots": "boots",
	
	"projecte:dm_helmet": "helmet",
	"projecte:dm_chestplate": "chestplate",
	"projecte:dm_leggings": "leggings",
	"projecte:dm_boots": "boots",
	
	"projecte:rm_katar": "sword",
	"projecte:rm_sword": "sword",
	"projecte:rm_morning_star": "tool",
	"projecte:rm_pick": "pickaxe",
	"projecte:rm_axe": "axe",
	"projecte:rm_shovel": "shovel",
	"projecte:rm_hoe": "hoe",
	"projecte:rm_shears": "shears",
	"projecte:rm_hammer": "hammer",
	
	"projecte:dm_sword": "sword",
	"projecte:dm_pick": "pickaxe",
	"projecte:dm_axe": "axe",
	"projecte:dm_shovel": "shovel",
	"projecte:dm_hoe": "hoe",
	"projecte:dm_shears": "shears",
	"projecte:dm_hammer": "hammer"
};

//---[CODE]---------------------------------------------------------------------------------------------------------------------------------------

// Load needed classes
const $Enchants = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries").ENCHANTMENT;

// Test items
const testItem = {
	helmet: "minecraft:netherite_helmet",
	chestplate: "minecraft:netherite_chestplate",
	leggings: "minecraft:netherite_leggings",
	boots: "minecraft:netherite_boots",
	sword: "minecraft:netherite_sword",
	bow: "minecraft:bow",
	crossbow: "minecraft:crossbow",
	tool: "draconicevolution:draconic_staff", // Only logical tool that is all tools that has enchants
	shears: "minecraft:shears",
	axe: "minecraft:netherite_axe",
	shovel: "minecraft:netherite_shovel",
	hoe: "minecraft:netherite_hoe",
	pickaxe: "minecraft:netherite_pickaxe",
	hammer: "minecraft:netherite_pickaxe",
	elytra: "minecraft:elytra"
};

// Check what block is in the place
function checkBlock(block)
{
	let id = block.getId();
	
	if (id === "ars_nouveau:source_jar" || id === "arseng:me_source_jar" || id === "ars_nouveau:creative_source_jar")
		return "source";
	
	if (id === "ars_nouveau:arcane_pedestal" || id === "ars_nouveau:arcane_platform")
		return "holder";
	
	return "empty";
}

// Check for block around
function checkAround(pos)
{
	// Object to return
	let result = { source: [], holder: [], totalSource: 0, driver: false, catalyst: false, infuser: false };
	
	// Check for the core
	if (pos.getDown().getId() !== "ars_nouveau:arcane_core")
		return false;
	
	// Get the blocks around
	for (let x = -1; x <= 1; x++)
	{
		for (let z = -1; z <= 1; z++)
		{
			if (x === 0 && z === 0)
				continue;
			
			let coords = pos.offset(x, 0, z);
			let type = checkBlock(coords);
			let data = coords.getEntityData();
			
			if (type === "empty")
				continue;
			
			if (type === "holder")
			{
				result.holder.push({ block: coords, data: data, item: data.itemStack.id });
				
				if (data.itemStack.id === infuser)
					result.infuser = true;
				
				if (data.itemStack.id === catalyst)
					result.catalyst = true;
				
				if (data.itemStack.id === driver)
					result.driver = true;
				
				continue;
			}
			
			if (type === "source")
			{
				result.source.push({ block: coords, data: data, creative: coords.getId() === "ars_nouveau:creative_source_jar" ? true : false });
				result.totalSource += data.source;
				continue;
			}
		}
	}
	
	// Check conditions
	if (result.holder.length !== 3)
		return false;
	
	if (result.source.length < 2)
		return false;
	
	return result;
};

// Enchant function
function enchantItem(item, enchant)
{
	let inItem = item.hasEnchantment(enchant.id, 1);
	
	if (inItem)
	{
		let index = item.nbt.Enchantments.indexOf(item.nbt.Enchantments.find(ench => ench.id === enchant.id));
		
		if (item.nbt.Enchantments[index].lvl < enchant.lvl)
			item.nbt.Enchantments[index].lvl = enchant.lvl
		else
			return false;
	}
	else
	{
		item.nbt.Enchantments.push(enchant);
	}
	
	return true;
};

// Cancel with message
function fail(event, message)
{
	failComp(event, Text.of(message));
}

function failComp(event, comp)
{
	event.getPlayer().tell(comp);
	event.cancel();
}

// Block left click for handling requirements
global.requirementShow = false;
BlockEvents.leftClicked(event => {
	// Get Constants
	const block = event.getBlock();
	const player = event.getPlayer();
	const server = player.getServer();
	const held = event.getItem();
	const data = block.getEntityData();
	
	// If player is sneaking ignore this
	if (player.isCrouching())
	{
		global.requirementShow = false;
		return;
	}
	
	// Triggers only when the platform is clicked and the item is an enchanted book
	if (block.getId() === "ars_nouveau:arcane_platform" && held.getId() === "minecraft:enchanted_book" && data.itemStack.id !== "minecraft:air")
	{
		// Prevents double
		if (global.requirementShow)
		{
			global.requirementShow = false;
			event.cancel();
			return;
		}
		
		// Validate enchanting item
		let target = data.itemStack.id;
		if (!infuseable[target])
		{
			fail(event, "§cThe target item it not valid for Godforge Infusion");
			return;
		}
		
		let type = infuseable[target];
		let targetEnchants = data.itemStack.tag && data.itemStack.tag.Enchantments ? data.itemStack.tag.Enchantments : [];
		let test = Item.of(testItem[type]).withNBT({ Enchantments: targetEnchants });
		
		// Validate the book
		if (!held.nbt || held.nbt.StoredEnchantments.length <= 0)
		{
			fail(event, "§cInvalid enchantment book, contains no enchants");
			return;
		}
		
		let heldEnchants = held.nbt.get("StoredEnchantments");
		
		// Gather the enchants that are valid and calculate costs
		let enchanted = false;
		let cost = sourceBase;
		let lvls = 0;
		
		heldEnchants.forEach(enchant => {		
			if ($Enchants.get(enchant.id).canEnchant(test))
			{
				let state = enchantItem(test, enchant);
				if (state)
				{
					enchanted = true;
					cost += sourceAmount;
					lvls += levelCost;
				}
			}
		});
		
		// Display the requirements
		player.tell(Text.of("§b§lRequirements:"));
		player.tell(Text.of(`§b- §e${cost} §dSource`));
		player.tell(Text.of(`§b- §e${lvls} §aLevels`));
		
		// Locks and cancels
		global.requirementShow = true;
		event.success();
	}
	else
	{
		global.requirementShow = false;
	}
});

// Block click for handling the enchanting
BlockEvents.rightClicked(event => {
	// Get Constants
	const block = event.getBlock();
	const player = event.getPlayer();
	const server = player.getServer();
	const held = event.getItem();
	const data = block.getEntityData();
	const hand = event.getHand();
	
	// If player is sneaking ignore this
	if (player.isCrouching())
		return;
	
	// Triggers only when the platform is clicked and the item is an enchanted book
	if (block.getId() === "ars_nouveau:arcane_platform" && held.getId() === "minecraft:enchanted_book" && data.itemStack.id !== "minecraft:air")
	{			
		// Validate structure
		let struct = checkAround(block);
		
		// If not valid structure ignore
		if (struct === false)
			return;
		
		// Validate enchanting item
		let target = data.itemStack.id;
		if (!infuseable[target])
		{
			fail(event, "§cThe target item it not valid for Godforge Infusion");
			return;
		}
		
		let type = infuseable[target];
		let targetEnchants = data.itemStack.tag && data.itemStack.tag.Enchantments ? data.itemStack.tag.Enchantments : [];
		let test = Item.of(testItem[type]).withNBT({ Enchantments: targetEnchants });
		
		// Validate the book
		if (!held.nbt || held.nbt.StoredEnchantments.length <= 0)
		{
			fail(event, "§cInvalid enchantment book, contains no enchants");
			return;
		}
		
		let heldEnchants = held.nbt.get("StoredEnchantments");
		
		// Gather the enchants that are valid and calculate costs
		let enchanted = false;
		let cost = sourceBase;
		let lvls = 0;
		
		heldEnchants.forEach(enchant => {
			if ($Enchants.get(enchant.id).canEnchant(test))
			{
				let state = enchantItem(test, enchant);
				if (state)
				{
					enchanted = true;
					cost += sourceAmount;
					lvls += levelCost;
				}
			}
		});
		
		// Check costs
		if (cost > 20000 * struct.source.length) // cap check
		{
			fail(event, `§cThe cost is higher than the maximum source supported. §bNeeds §e${cost}§b but can only handle §e${10000 * struct.source.length}`);
			return;
		}
		
		if (cost > struct.totalSource) // current check
		{
			fail(event, `§cThe cost is higher than the source available. §bNeeds §e${cost}§b but has §e${struct.totalSource}`);
			return;
		}
		
		if (lvls > player.experienceLevel && !player.creative) // levels check
		{
			fail(event, `§cYou don't have enough levels. §bNeeds §e${lvls}§b but you have §e${player.experienceLevel}`);
			return;
		}
		
		if (!struct.infuser)
		{
			let ingredient = Item.of(infuser, 1);
			failComp(event, Text.of("§bYou are missing §e1 ").append(ingredient.getDisplayName()).append("§b from your pedestals"));
			return;
		}
		
		if (!struct.catalyst)
		{
			let ingredient = Item.of(catalyst, 1);
			failComp(event, Text.of("§bYou are missing §e1 ").append(ingredient.getDisplayName()).append("§b from your pedestals"));
			return;
		}
		
		if (!struct.driver)
		{
			let ingredient = Item.of(driver, 1);
			failComp(event, Text.of("§bYou are missing §e1 ").append(ingredient.getDisplayName()).append("§b from your pedestals"));
			return;
		}
		
		// Transfer enchants		
		if (enchanted)
		{
			if (!data.itemStack.tag)
				data.itemStack.tag = {};
			
			// Take levels
			if (!player.creative)
				player.addXPLevels(-lvls);
			
			// Take source
			struct.source.forEach(jar => {
				if (cost === 0)
					return;
				
				cost -= jar.data.source;
				
				if (jar.creative)
					return;
				
				jar.data.source = cost < 0 ? cost * -1 : 0;
				jar.block.setEntityData(jar.data);
				jar.block.getEntity().updateBlock();
				
				if (cost < 0)
					cost = 0;
			});
			
			// Take ingredients
			struct.holder.forEach(hold => {
				if (hold.item !== infuser && hold.item !== catalyst)
					return;
				
				hold.data.itemStack.id = "minecraft:air";
				hold.block.setEntityData(hold.data);
				hold.block.getEntity().updateBlock();
				
				let pos = "";
				
				if (hold.block.getId().endsWith("platform"))
					pos = `${hold.block.getX()} ${hold.block.getY()+0.5} ${hold.block.getZ()}`;
				else
					pos = `${hold.block.getX()} ${hold.block.getY()+1} ${hold.block.getZ()}`;
				
				for (let i = 0; i < 19; i++)
					server.schedule(i, cb => server.runCommandSilent(`particle minecraft:dragon_breath ${pos} 0.2 0.2 0.2 0.01 2 normal`));
			});
			
			// Place enchantments
			let pos = `${block.getX()} ${block.getY()+0.75} ${block.getZ()}`;
			for (let i = 0; i < 19; i++)
				server.schedule(i, cb => server.runCommandSilent(`particle minecraft:dragon_breath ${pos} 0.2 0.2 0.2 0.01 2 normal`));
			
			data.itemStack.tag.Enchantments = test.nbt.Enchantments;
			block.setEntityData(data);
			
			// Take book
			if (!player.creative)
				held.shrink(1);
		}
		else
		{
			player.tell(Text.of("The book as no enchantments to apply to the item").yellow());
		}
		
		// Make the event succeed but cancels block interaction
		event.success();
	}
});
