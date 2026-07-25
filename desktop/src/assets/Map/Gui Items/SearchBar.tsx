import './SearchBar.css'


const SearchBar = ({ search, setSearch, onSearch, poiOpen }: { search: string, setSearch: (search: string) => void, onSearch: () => void, poiOpen?: boolean }) => {

    return (
        <div className={`search-bar-container ${poiOpen ? 'shifted' : ''}`}>
            <input 
                className="search-bar-input" 
                placeholder='Search Here (coordinates only for now)' 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        onSearch();
                    }
                }}
            />
        </div>
    )
}

export default SearchBar