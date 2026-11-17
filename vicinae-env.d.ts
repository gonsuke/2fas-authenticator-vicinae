/// <reference types="@vicinae/api">

/*
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 */

type ExtensionPreferences = {
  
}

declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Command: Search OTP */
	export type SearchOtp = Omit<ExtensionPreferences, never> & {
		
	}

	/** Command: Recent OTP */
	export type RecentOtp = Omit<ExtensionPreferences, never> & {
		
	}

	/** Command: Import Vault */
	export type ImportVault = Omit<ExtensionPreferences, never> & {
		
	}

	/** Command: Setup */
	export type Setup = Omit<ExtensionPreferences, never> & {
		
	}
}

declare namespace ToolPreferences {
  
}

declare namespace Arguments {
  /** Command: Search OTP */
	export type SearchOtp = {
		
	}

	/** Command: Recent OTP */
	export type RecentOtp = {
		
	}

	/** Command: Import Vault */
	export type ImportVault = {
		
	}

	/** Command: Setup */
	export type Setup = {
		
	}
}