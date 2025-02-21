import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { range } from 'd3-array';

import './Setup.css';
import Embedding from '../components/Setup/Embedding';
import Umap from '../components/Setup/Umap';
import Cluster from '../components/Setup/Cluster';
import ClusterLabels from '../components/Setup/ClusterLabels';
import Scope from '../components/Setup/Scope';
import Stage from '../components/Setup/Stage';
import HullPlot from '../components/HullPlot';

import IndexDataTable from '../components/IndexDataTable';
import Scatter from '../components/Scatter';
  
const apiUrl = import.meta.env.VITE_API_URL

function Setup() {
  const [dataset, setDataset] = useState(null);
  const { dataset: datasetId, scope: scopeId } = useParams();

  const navigate = useNavigate();

  const scopeWidth = 500
  const scopeHeight = 500

  // Get the dataset meta data
  useEffect(() => {
    fetch(`${apiUrl}/datasets/${datasetId}/meta`)
      .then(response => response.json())
      .then(data => setDataset(data));
  }, [datasetId]);

  // default text column from columns
  const textColumn = useMemo(() => {
    if (!dataset) return "";
    return dataset.text_column || dataset.columns[0];
  }, [dataset])

  // set the text column on our dataset
  const handleChangeTextColumn = useCallback((event) => {
    const column = event.target.value;
    console.log("setting column", column)
    fetch(`${apiUrl}/datasets/${datasetId}/meta/update?key=text_column&value=${column}`)
      .then(response => response.json())
      .then(data => {
        // console.log("updated meta", data)
        setDataset(data)
      });
  }, [datasetId])
 

  // ====================================================================================================
  // embeddings 
  // ====================================================================================================
  // get the list of available embeddings, and refresh when a new one is created
  const [embeddings, setEmbeddings] = useState([]);
  // embedding is a string identifier
  const [embedding, setEmbedding] = useState(embeddings[0]);

  useEffect(() => {
    if(embeddings?.length && !embedding){
      setEmbedding(embeddings[0])
    }
  }, [embeddings, embedding])

  // ====================================================================================================
  // umaps
  // ====================================================================================================

  const [umaps, setUmaps] = useState([]);
  const [umap, setUmap] = useState(null);
  // the name of the umap selected by the user
  const [selectedUmap, setSelectedUmap] = useState(null);

  useEffect(() => {
      if(umaps.length && embedding) {
        const embeddingUmaps = umaps.filter(d => d.embedding_id == embedding.id)
        const found = embeddingUmaps.find(d => d.id == selectedUmap)
        if(selectedUmap && found) {
          setUmap(found)
        } else {
          setUmap(embeddingUmaps[0])
        }
      }
  }, [selectedUmap, umaps, embedding])  

  // ====================================================================================================
  // clusters
  // ==================================================================================================== 

  const [clusters, setClusters] = useState([]);
  const [cluster, setCluster] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);

  useEffect(() => {
    if(clusters.length && umap) {
      const umapClusters = clusters.filter(d => d.umap_id == umap.id)
      const found = umapClusters.find(d => d.cluster_id == selectedCluster)
      if(selectedCluster && found) {
        setCluster(found)
      } else {
        setCluster(umapClusters[0])
      }
    } else {
      setCluster(null)
    }
  }, [selectedCluster, clusters, umap, setCluster]) 

  // the currently chosen model used to label the active cluster
  const [clusterLabelId, setClusterLabelId] = useState("default"); 
  const [selectedClusterLabelId, setSelectedClusterLabelId] = useState("default");
  const [clusterLabelIds, setClusterLabelIds] = useState([]); 

  useEffect(() => {
    if(clusterLabelIds && cluster) {
      const found = clusterLabelIds.filter(d => d.cluster_id == cluster.id)
      if(selectedClusterLabelId && found) {
        if(found.find(d => d.id == selectedClusterLabelId)) {
          setClusterLabelId(selectedClusterLabelId)
        } else {
          setClusterLabelId(found[0]?.id)
        }
      } else {
        setClusterLabelId(clusterLabelIds[0]?.id)
      }
    } else {
      setClusterLabelId(null)
    }
  }, [cluster, selectedClusterLabelId, clusterLabelIds, setClusterLabelId])

  // ====================================================================================================
  // scopes
  // ====================================================================================================
  const[scopes, setScopes] = useState([]);
  const[scope, setScope] = useState(null);

  // When the scopeId changes, update the scope and set all the default selections
  useEffect(() => {
    if(scopeId && scopes?.length) {
      const scope = scopes.find(d => d.id == scopeId)
      console.log("finding the scope", scope)
      if(scope) {
        setScope(scope)
        setEmbedding(embeddings.find(e => e.id == scope.embedding_id))
        setSelectedUmap(scope.umap_id)
        setSelectedCluster(scope.cluster_id)
        setSelectedClusterLabelId(scope.cluster_labels_id)
      }
    } else {
      setScope(null)
    } 
  }, [scopeId, scopes, embeddings])


  // ====================================================================================================
  // selected points from the scatterplot 
  // ====================================================================================================
  const [selectedIndices, setSelectedIndices] = useState([]);
  const handleSelected = useCallback((indices) => {
    setSelectedIndices(indices);
  }, [setSelectedIndices])

  const [scatter, setScatter] = useState({})
  const [xDomain, setXDomain] = useState([-1, 1]);
  const [yDomain, setYDomain] = useState([-1, 1]);
  const handleView = useCallback((xDomain, yDomain) => {
    setXDomain(xDomain);
    setYDomain(yDomain);
  }, [setXDomain, setYDomain])


  const hydrateIndices = useCallback((indices, setter, distances = []) => {
    fetch(`${apiUrl}/indexed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dataset: dataset.id, indices: indices }),
    })
    .then(response => response.json())
    .then(data => {
      if(!dataset) return;
      let rows = data.map((row, index) => {
        return {
          index: indices[index],
          ...row
        }
      })
      setter(rows)
    })
  }, [dataset, datasetId])

  // Hover via scatterplot or tables
  // index of item being hovered over
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const handleHovered = useCallback((index) => {
      setHoveredIndex(index);
  }, [setHoveredIndex])

  const [hovered, setHovered] = useState(null);
  useEffect(() => {
    if(hoveredIndex >= 0 && hoveredIndex != null) {
      hydrateIndices([hoveredIndex], (results) => {
        setHovered(results[0])
      })
    } else {
      setHovered(null)
    }
  }, [hoveredIndex, setHovered, hydrateIndices])

  const [clusterIndices, setClusterIndices] = useState([]);
  const [clusterLabels, setClusterLabels] = useState([]);
  useEffect(() => {
    if(cluster) {
      fetch(`${apiUrl}/datasets/${datasetId}/clusters/${cluster.id}/indices`)
        .then(response => response.json())
        .then(data => {
          // console.log("cluster indices", data)
          setClusterIndices(data)
        });
    } else {
      setClusterIndices([])
    }
  }, [cluster, setClusterIndices, datasetId])

  const memoClusterIndices = useMemo(() => {
    return clusterIndices.map(d => d.cluster)
  }, [clusterIndices])


  const [selectedClusterLabel, setSelectedClusterLabel] = useState(null);

  const [hoveredCluster, setHoveredCluster] = useState(null);
  const [hoveredClusterHull, setHoveredClusterHull] = useState(null);
  useEffect(() => {
    if(hovered && clusterIndices.length && clusterLabels.length){
      const index = hovered.index
      const cluster = clusterIndices[index]
      const label = clusterLabels[cluster?.cluster]
      setHoveredCluster({...label, cluster: cluster.cluster})
    } else {
      setHoveredCluster(null)
    }
  }, [hovered, clusterIndices, clusterLabels, setHoveredCluster])


  const [points, setPoints] = useState([]);
  // const [loadingPoints, setLoadingPoints] = useState(false);
  useEffect(() => {
    if(umap) {
      fetch(`${apiUrl}/datasets/${dataset.id}/umaps/${umap.id}/points`)
        .then(response => response.json())
        .then(data => {
          // console.log("umap points", data)
          setPoints(data.map(d => [d.x, d.y]))
        })
    } else {
      console.log("set points empty")
      setPoints([])
    }
  }, [dataset, umap])



  // ====================================================================================================
  // progress indicator through stages
  // determine which section (if any) to highlight based on what has been set
  // ====================================================================================================
  const [stage, setStage] = useState(1);
  useEffect(() => {
    if(!embedding) {
      setStage(1)
    } else if(!umap) {
      setStage(2)
    } else if(!cluster) {
      setStage(3)
    } else if(!clusterLabelId) {
      setStage(4)
    } else if(!scope) {
      setStage(5)
    } else {
      setStage(6)
    }
    console.log("SCOPE", scope, embedding, umap, cluster, clusterLabelId)
  }, [embedding, umap, cluster, clusterLabelId, scope])


  const handleNewEmbeddings = useCallback((embs, emb) => {
    setEmbeddings(embs)
    if(emb) setEmbedding(emb)
  }, [setEmbeddings, setEmbedding])

  const handleNewUmaps = useCallback((umaps, ump) => {
    setUmaps(umaps)
    if(ump) setUmap(ump)
    // if no umaps for the current embedding, unset the umap
    if(!umaps.filter(d => d.embedding_id == embedding?.id).length) {
      setUmap(null)
    }
  }, [setUmaps, setUmap, embedding])

  const handleNewClusters = useCallback((clusters, cls) => {
    setClusters(clusters)
    if(cls) setCluster(cls)
    // if no clusters for the current umap, unset the cluster
    if(!clusters.filter(d => d.umap_id == umap?.id).length) {
      setCluster(null)
    }
  }, [setClusters, setCluster, umap])
 
  const handleNewClusterLabelIds = useCallback((labels, lbl) => {
    setClusterLabelIds(labels)
    if(lbl) setSelectedClusterLabelId(lbl)
    // if no labels for the current cluster, unset the labels
    if(!labels.filter(d => d.cluster_id == cluster?.id).length) {
      setSelectedClusterLabelId("default")
      setClusterLabels([])
    }
  }, [setClusterLabelIds, setSelectedClusterLabelId, cluster])


  if (!dataset) return <div>Loading...</div>;

  return (
    <div className="dataset--setup">
      <div className="dataset--setup-summary">
        <h3>{datasetId}</h3>
        <div className="dataset--setup-info">
          <div className="dataset--setup-info-content">
            { scope ? <Link to={`/datasets/${dataset?.id}/explore/${scope?.id}`}> Explore {scope.label} ({scope.id}) <br/></Link> : null }
            {dataset.length} rows <br/>
            Columns: {dataset.columns.join(", ")}
            <div className="dataset--details-text-column">
              Set Text Column: 
              <select value={textColumn} onChange={handleChangeTextColumn}>
                {dataset.columns.map((column, index) => (
                  <option key={index} value={column}>{column}</option>
                ))}
              </select>
            </div>
            
          </div>

          <div className="dataset--setup-meta">
            <div className="dataset--setup-scopes-list">
                {scopes ? 
                  <select className="scope-selector" onChange={(e) => navigate(`/datasets/${dataset?.id}/setup/${e.target.value}`)}>
                    <option value="">New scope</option>
                    {scopes.map((scopeOption, index) => (
                      <option key={index} value={scopeOption.id} selected={scopeOption.id === scope?.id}>
                        {scopeOption.label || scopeOption.id}
                      </option>
                    ))}
                  </select> 
                : null}
            </div>
            <div className="job-history">
              <Link to={`/datasets/${dataset?.id}/jobs`}> Job history</Link><br/>
            </div>
          </div> 
        </div>
      </div>

      <div className="dataset--setup-layout">
        <div className="dataset--setup-left-column">
          <Stage active={stage == 1} complete={stage > 1} title="1. Embeddings">
            <Embedding dataset={dataset} textColumn={textColumn} embedding={embedding} umaps={umaps} clusters={clusters} onNew={handleNewEmbeddings} onChange={setEmbedding} />
          </Stage>
          <Stage active={stage == 2} complete={stage > 2} title="2. UMAP">
            <Umap dataset={dataset} umap={umap} embedding={embedding} clusters={clusters} onNew={handleNewUmaps} onChange={setUmap} />
          </Stage>
          <Stage active={stage == 3} complete={stage > 3} title="3. Clusters">
            <Cluster dataset={dataset} cluster={cluster} umap={umap} onNew={handleNewClusters} onChange={setCluster} />
          </Stage>
          <Stage active={stage == 4} complete={stage > 4} title="4. Auto-Label Clusters">
            <ClusterLabels 
              dataset={dataset} 
              cluster={cluster} 
              selectedLabelId={clusterLabelId} 
              onChange={setSelectedClusterLabelId} 
              onLabelIds={handleNewClusterLabelIds} 
              onLabels={setClusterLabels} 
              onHoverLabel={setHoveredClusterHull} 
              onClickLabel={(c) => { console.log("CLUSTER", c); setSelectedClusterLabel(c)}} 
            />
          </Stage>
          <Stage active={stage == 5} complete={stage > 5} title="5. Save Scope">
            <Scope dataset={dataset} scope={scope} embedding={embedding} umap={umap} cluster={cluster} clusterLabelId={clusterLabelId} onNew={setScopes} onChange={setScope} />
          </Stage>
        </div>

        {/* RIGHT COLUMN */}
        <div className="dataset--setup-right-column">
          <div className="dataset--setup-preview">
            {selectedClusterLabel ? <div>
              <b>Cluster {selectedClusterLabel.index}: {selectedClusterLabel.label}</b>
                <IndexDataTable 
                dataset={dataset}
                indices={selectedClusterLabel.indices} 
                datasetId={datasetId} 
                maxRows={100} 
                />
              </div> : <div><b>Dataset Preview</b>
              <IndexDataTable 
                dataset={dataset}
                indices={range(0, 100)} 
                datasetId={datasetId} 
                maxRows={100} 
                />
              </div> }
          </div>
          <div className="dataset--setup-umap">

            { points.length ? <Scatter 
              points={points} 
              colors={memoClusterIndices}
              width={scopeWidth} 
              height={scopeHeight}
              onScatter={setScatter}
              onView={handleView} 
              onSelect={handleSelected}
              onHover={handleHovered}
              /> : null }
            { hoveredCluster && hoveredCluster.hull ? <HullPlot
              points={points}
              hulls={[hoveredCluster.hull]}
              fill="lightgray"
              xDomain={xDomain} 
              yDomain={yDomain} 
              width={scopeWidth} 
              height={scopeHeight} /> : null }
            { selectedClusterLabel && selectedClusterLabel.hull ? <HullPlot
              points={points}
              hulls={[selectedClusterLabel.hull]}
              fill="red"
              stroke="black"
              xDomain={xDomain} 
              yDomain={yDomain} 
              width={scopeWidth} 
              height={scopeHeight} /> : null }

            { hoveredClusterHull && hoveredClusterHull.hull ? <HullPlot
              points={points}
              hulls={[hoveredClusterHull.hull]}
              fill="orange"
              stroke="black"
              xDomain={xDomain} 
              yDomain={yDomain} 
              width={scopeWidth} 
              height={scopeHeight} /> : null }
            { clusterLabels.length ? <HullPlot
              points={points}
              hulls={clusterLabels.map(d => d.hull)}
              stroke="lightgray"
              xDomain={xDomain} 
              yDomain={yDomain} 
              width={scopeWidth} 
              height={scopeHeight} /> : null } 
          </div>

          <div className="dataset--hovered">
            {/* Hovered: &nbsp; */}
            {hovered && Object.keys(hovered).map((key) => (
              <span key={key}>
                <span className="key">{key}:</span> 
                <span className="value">{hovered[key]}</span>
              </span>
            ))}
            {hoveredCluster ? <span><span className="key">Cluster:</span><span className="value">{hoveredCluster.label}</span></span> : null }
            {/* <DataTable  data={hovered} tagset={tagset} datasetId={datasetId} onTagset={(data) => setTagset(data)} /> */}
          </div>

          {/* <div className="dataset--selected">
            <span>Points Selected: {selectedIndices.length} {!selectedIndices.length ? "(Hold shift and drag an area of the map to select)" : null}
              {selectedIndices.length > 0 ? 
                <button className="deselect" onClick={() => {
                  setSelectedIndices([])
                  scatter?.select([])
                  scatter?.zoomToOrigin({ transition: true, transitionDuration: 1500 })
                }
                }>X</button> 
              : null}
            </span>
            {selectedIndices.length > 0 ? 
            <div className="dataset--selected-table">
              <IndexDataTable 
                dataset={dataset}
                indices={selectedIndices} 
                datasetId={datasetId} 
                maxRows={150} 
                />
            </div>
            : null }
          </div>
        
         */}
        </div>
      </div>
    </div>
  );
}

export default Setup;