CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('checking','savings','investment','credit_card') NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'EUR',
	`initial_balance` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_id` int NOT NULL,
	`category_id` int NOT NULL,
	`planned_amount` int NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budget_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`month` int,
	`name` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`group_name` varchar(50) NOT NULL,
	`icon` varchar(50),
	`is_income` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_holdings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_id` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`name` varchar(200) NOT NULL,
	`shares` decimal(16,6) NOT NULL,
	`cost_basis` int NOT NULL,
	`purchase_date` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_holdings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`date` date NOT NULL,
	`price` int NOT NULL,
	CONSTRAINT `stock_prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `symbol_date_idx` UNIQUE(`symbol`,`date`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_id` int NOT NULL,
	`category_id` int,
	`date` date NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` int NOT NULL,
	`notes` varchar(500),
	`import_hash` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_import_hash_unique` UNIQUE(`import_hash`)
);
--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_budget_id_budgets_id_fk` FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_holdings` ADD CONSTRAINT `stock_holdings_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `name_type_idx` ON `accounts` (`name`,`type`);--> statement-breakpoint
CREATE INDEX `budget_idx` ON `budget_items` (`budget_id`);--> statement-breakpoint
CREATE INDEX `bi_category_idx` ON `budget_items` (`category_id`);--> statement-breakpoint
CREATE INDEX `sh_account_idx` ON `stock_holdings` (`account_id`);--> statement-breakpoint
CREATE INDEX `account_idx` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `transactions` (`date`);