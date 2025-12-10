import type { Accessor, Setter } from "solid-js"
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/core"
import { SearchIcon, FilterIcon } from "lucide-solid"
import type { FilterOption } from "../types"
import { FILTER_OPTIONS } from "../constants"

type SearchFilterProps = {
  searchQuery: Accessor<string>
  setSearchQuery: Setter<string>
  filterStatus: Accessor<FilterOption>
  setFilterStatus: Setter<FilterOption>
}

export const SearchFilter = (props: SearchFilterProps) => {
  return (
    <div class="grid grid-cols-1 grid-rows-2 gap-3 @md:grid-cols-[2fr_1fr] @md:grid-rows-1">
      <div class="relative w-full">
        <SearchIcon class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search apps..."
          value={props.searchQuery()}
          onInput={(e) => props.setSearchQuery(e.currentTarget.value)}
          class="pl-9"
        />
      </div>
      <Select<FilterOption>
        value={props.filterStatus()}
        onChange={(val) => val && props.setFilterStatus(val)}
        options={FILTER_OPTIONS}
        optionValue="value"
        optionTextValue="label"
        itemComponent={(p) => <SelectItem item={p.item}>{p.item.rawValue.label}</SelectItem>}
      >
        <SelectTrigger class="w-full">
          <FilterIcon class="mr-2 size-4 text-muted-foreground" />
          <SelectValue<FilterOption>>{(state) => state.selectedOption().label}</SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </div>
  )
}
