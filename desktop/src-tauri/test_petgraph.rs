use petgraph::Graph;
use petgraph::visit::EdgeRef;
fn main() {
    let mut g = Graph::<(), f64, petgraph::Undirected>::new_undirected();
    let a = g.add_node(());
    let b = g.add_node(());
    g.add_edge(a, b, 1.0);
    for e in g.edges(b) {
        println!("iterating b: source={:?}, target={:?}", e.source(), e.target());
    }
}
