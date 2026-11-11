import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { PostGrid } from "@/components/post-grid";
import { Avatar, EmptyState, Text, TextField } from "@/components/ui";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { searchProfiles } from "@/lib/data/profiles";
import { useBlocked, useExplore } from "@/lib/queries";
import { userHref } from "@/lib/routes";

export default function ExploreScreen() {
  const theme = useTheme();
  const [text, setText] = useState("");
  const term = text.trim();
  const blocked = useBlocked();
  const explore = useExplore();
  const results = useQuery({
    queryKey: ["search", term],
    queryFn: () => searchProfiles(term),
    enabled: term.length > 0,
  });

  const header = (
    <View style={styles.search}>
      <TextField
        placeholder="Search artists"
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>
  );

  const people = (results.data ?? []).filter(
    (p) => !blocked.data?.includes(p.uid),
  );
  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      {header}
      {term.length > 0 ? (
        <FlatList
          data={people}
          keyExtractor={(p) => p.uid}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            results.isLoading ? undefined : (
              <EmptyState
                icon="search-outline"
                title="No artists found"
                message={`Nobody matches "${term}".`}
              />
            )
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.person}
              accessibilityRole="button"
              accessibilityLabel={`View ${item.username}`}
              onPress={() => router.push(userHref(item.uid))}
            >
              <Avatar uri={item.photoURL} name={item.username} size={44} />
              <View>
                <Text variant="label">{item.username}</Text>
                {item.name ? (
                  <Text variant="caption" muted>
                    {item.name}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      ) : (
        <PostGrid
          posts={explore.data?.pages.flatMap((p) => p.items) ?? []}
          refreshing={explore.isRefetching}
          onRefresh={() => void explore.refetch()}
          onEndReached={() =>
            explore.hasNextPage &&
            !explore.isFetchingNextPage &&
            explore.fetchNextPage()
          }
          emptyMessage="Be the first to post something."
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { padding: spacing.lg },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
