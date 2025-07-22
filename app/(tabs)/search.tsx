import seed from "@/lib/seed";
import React from "react";
import { Button, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Search = () => {
  return (
    <SafeAreaView>
      <Text>Search</Text>
      <Button
        title="Seed"
        onPress={() =>
          seed().catch((error) =>
            console.log("failed to seed the databases", error)
          )
        }
      />
    </SafeAreaView>
  );
};

export default Search;
