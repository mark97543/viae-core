import './SearchBar.css'


const SearchBar = ({ search, setSearch, executeSearch, poiOpen }: { search: string, setSearch: (search: string) => void, executeSearch: () => void, poiOpen?: boolean }) => {

    return (
        <div className={`search-bar-container ${poiOpen ? 'shifted' : ''}`}>
            <input 
                className="search-bar-input" 
                placeholder='Search Here (coordinates only for now)' 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        executeSearch();
                    }
                }}
            />
        </div>
    )
}

export default SearchBar