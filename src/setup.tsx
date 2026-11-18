// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Adrian Galvez (LockeAG) — original 2FAS Authenticator
// Raycast extension (https://github.com/LockeAG/raycast-2fas-authenticator).
// Ported for Vicinae/Linux; see NOTICE.md.

import { useState, useEffect, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  LaunchType,
  launchCommand,
} from "@vicinae/api";
import {
  isVaultConfigured,
  deleteVault,
  loadVault,
  lockVault,
} from "./lib/vault";
import { diagnoseKeychain, type KeychainDiagnostic } from "./lib/keychain";
import { withVaultUnlock } from "./lib/vault-ui";

export default function Setup() {
  const [vaultExists, setVaultExists] = useState(false);
  const [serviceCount, setServiceCount] = useState<number>();
  const [diagnostic, setDiagnostic] = useState<KeychainDiagnostic>();
  const [isLoading, setIsLoading] = useState(true);

  const check = useCallback(async () => {
    setIsLoading(true);
    setDiagnostic(diagnoseKeychain());
    const configured = isVaultConfigured();
    setVaultExists(configured);
    if (!configured) {
      setServiceCount(undefined);
      setIsLoading(false);
      return;
    }
    try {
      const services = await withVaultUnlock(() => loadVault());
      setServiceCount(services.length);
    } catch {
      setServiceCount(undefined);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Delete Vault?",
      message:
        "This will permanently delete your encrypted vault and the keyring entry holding its key.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    deleteVault();
    await showToast({ style: Toast.Style.Success, title: "Vault deleted" });
    check();
  }, [check]);

  const handleLock = useCallback(async () => {
    lockVault();
    await showToast({
      style: Toast.Style.Success,
      title: "Vault locked",
      message:
        "The vault will be re-read from disk (and the keyring accessed) on next use",
    });
  }, []);

  const statusIcon = (ok: boolean) =>
    ok
      ? { source: Icon.CheckCircle, tintColor: Color.Green }
      : { source: Icon.XMarkCircle, tintColor: Color.Red };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Status">
        <List.Item
          icon={statusIcon(vaultExists)}
          title="Vault"
          subtitle={vaultExists ? "Configured" : "Not configured"}
          accessories={
            serviceCount !== undefined
              ? [{ text: `${serviceCount} services` }]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                onAction={check}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      {diagnostic && (
        <List.Section title="Keyring (Secret Service)">
          <List.Item
            icon={statusIcon(diagnostic.toolAvailable)}
            title="libsecret tools"
            subtitle={diagnostic.toolAvailable ? "secret-tool found" : "secret-tool missing"}
          />
          <List.Item
            icon={statusIcon(diagnostic.serviceAvailable)}
            title="Secret Service provider"
            subtitle={
              diagnostic.serviceAvailable
                ? "Reachable on the session bus"
                : "Not reachable"
            }
          />
          <List.Item
            icon={statusIcon(diagnostic.keyStored)}
            title="Vault key"
            subtitle={diagnostic.keyStored ? "Stored in keyring" : "Not stored"}
          />
          {diagnostic.hint && (
            <List.Item
              icon={{ source: Icon.Exclamationmark, tintColor: Color.Orange }}
              title="Hint"
              subtitle={diagnostic.hint}
            />
          )}
        </List.Section>
      )}
      <List.Section title="Actions">
        {!vaultExists && (
          <>
            <List.Item
              icon={Icon.Download}
              title="1. Export from 2FAS"
              subtitle="Settings > 2FAS Backup > Export (with password)"
            />
            <List.Item
              icon={Icon.ArrowRight}
              title="2. Import Vault"
              subtitle="Import your .2fas export file"
              actions={
                <ActionPanel>
                  <Action
                    title="Open Import"
                    icon={Icon.Download}
                    onAction={() =>
                      launchCommand({
                        name: "import-vault",
                        type: LaunchType.UserInitiated,
                      })
                    }
                  />
                </ActionPanel>
              }
            />
          </>
        )}
        {vaultExists && (
          <>
            <List.Item
              icon={Icon.ArrowClockwise}
              title="Re-import Vault"
              subtitle="Update services from a new 2FAS export"
              actions={
                <ActionPanel>
                  <Action
                    title="Re-Import"
                    icon={Icon.ArrowClockwise}
                    onAction={() =>
                      launchCommand({
                        name: "import-vault",
                        type: LaunchType.UserInitiated,
                      })
                    }
                  />
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Lock}
              title="Lock Vault Now"
              subtitle="Clear in-memory cache; next code reads the vault and keyring again"
              actions={
                <ActionPanel>
                  <Action
                    title="Lock Vault"
                    icon={Icon.Lock}
                    onAction={handleLock}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              title="Delete Vault"
              subtitle="Remove vault and keyring key"
              actions={
                <ActionPanel>
                  <Action
                    title="Delete Vault"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleDelete}
                  />
                </ActionPanel>
              }
            />
          </>
        )}
      </List.Section>
      <List.Section title="Credits">
        <List.Item
          icon={Icon.Person}
          title="Original extension"
          subtitle="2FAS Authenticator for Raycast by Adrian Galvez (LockeAG), MIT"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Upstream Repository"
                url="https://github.com/LockeAG/raycast-2fas-authenticator"
              />
              <Action.OpenInBrowser
                title="Open Raycast Listing"
                url="https://www.raycast.com/Lock/2fas-authenticator"
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Heart}
          title="This port"
          subtitle="Unofficial Linux/Vicinae port. Not affiliated with the upstream author, Raycast, or 2FAS."
        />
      </List.Section>
    </List>
  );
}
