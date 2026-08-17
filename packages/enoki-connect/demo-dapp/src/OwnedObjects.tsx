// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentAccount, useCurrentClient } from "@mysten/dapp-kit-react";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";

export function OwnedObjects() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const { data, isPending, error } = useQuery({
    queryKey: ["ownedObjects", account?.address],
    queryFn: async () => {
      if (!account) return null;

      const { response } = await client.stateService.listOwnedObjects({
        owner: account.address,
      });
      return response.objects ?? [];
    },
    enabled: !!account,
  });

  if (!account) {
    return;
  }

  if (error) {
    return <Flex>Error: {error.message}</Flex>;
  }

  if (isPending || !data) {
    return <Flex>Loading...</Flex>;
  }

  return (
    <Flex direction="column" my="2">
      {data.length === 0 ? (
        <Text>No objects owned by the connected wallet</Text>
      ) : (
        <Heading size="4">Objects owned by the connected wallet</Heading>
      )}
      {data.map((object) => (
        <Flex key={object.objectId}>
          <Text>Object ID: {object.objectId}</Text>
        </Flex>
      ))}
    </Flex>
  );
}
